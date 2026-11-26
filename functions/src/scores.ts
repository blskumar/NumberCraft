// Score validation. HONEST SCOPE: the server cannot replay the game. This is
// plausibility (arithmetic bounds from the engine constants) + rate limiting +
// provenance (a server-timed round token bound to uid and game). A determined
// cheater who forges plausible stats and waits out the minimum time can still
// post a score below the hard bound. Upgrade path: deterministic replay of move
// logs (done below for Factor Grid solo; Foundry and Odds need seeded RNG +
// move logs from the client, then reuse the pure engines server-side).
import { Timestamp } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { randomBytes } from 'node:crypto';
import {
  ARITHMETIC_FLAG_ANSWERS_PER_SECOND,
  ARITHMETIC_MAX_POINTS_PER_ANSWER,
  ARITHMETIC_MIN_SECONDS_PER_ANSWER,
  ARITHMETIC_PACE_SECONDS,
  ARITHMETIC_UNTIMED_MAX_SECONDS,
  DAILY_HARD_MAX,
  DAILY_TIME_LIMITS,
  FACTOR_BOARD_MAX,
  GAME_IDS,
  GAME_TITLES,
  MIN_ROUND_SECONDS,
  ODDS_HARD_MAX,
  ODDS_P99,
  RATE,
  ROUND_TTL_MS,
  TIERS,
  factorGridHardMax,
  type GameId,
  type Tier,
} from './limits';
import { replayFactorGridSolo } from './replay';
import { suggestSafeName, validateDisplayName } from './shared/name-moderation';
import { requireAuth, requireConsent, type AuthLike, type Deps } from './common';

const ROUND_ID_RE = /^[a-f0-9]{24}$/;
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const dayOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export async function startRound(deps: Deps, auth: AuthLike | undefined, data: unknown) {
  const { uid } = requireAuth(auth);
  const d = isObj(data) ? data : {};
  if (!GAME_IDS.includes(d.gameId as GameId)) throw new HttpsError('invalid-argument', 'bad-game');
  if (!TIERS.includes(d.tier as Tier)) throw new HttpsError('invalid-argument', 'bad-tier');
  const gameId = d.gameId as GameId;
  const now = deps.now();
  await requireConsent(deps, uid);

  // Rate limit: min gap between starts and a daily cap.
  const rl = deps.db.doc(`rateLimits/${uid}`);
  await deps.db.runTransaction(async (tx) => {
    const s = await tx.get(rl);
    const cur = s.exists ? s.data()! : {};
    const day = dayOf(now);
    const same = cur.day === day;
    const starts = same ? (cur.starts as number) : 0;
    if (typeof cur.lastStartMs === 'number' && now - cur.lastStartMs < RATE.startMinGapMs) {
      throw new HttpsError('resource-exhausted', 'too-many-rounds');
    }
    if (starts >= RATE.startsPerDay) throw new HttpsError('resource-exhausted', 'daily-round-cap');
    tx.set(
      rl,
      { day, starts: starts + 1, submits: same ? cur.submits ?? 0 : 0, lastStartMs: now },
      { merge: true }
    );
  });

  // One open round per uid+game: supersede any previous one.
  const open = await deps.db
    .collection('rounds')
    .where('uid', '==', uid)
    .where('gameId', '==', gameId)
    .where('status', '==', 'open')
    .get();
  const batch = deps.db.batch();
  open.forEach((doc) => batch.update(doc.ref, { status: 'superseded' }));

  const roundId = randomBytes(12).toString('hex');
  batch.set(deps.db.doc(`rounds/${uid}_${roundId}`), {
    uid,
    gameId,
    tier: d.tier,
    status: 'open',
    startedAt: Timestamp.fromMillis(now),
    // Firestore TTL policy field (collection group "rounds", field expiresAt).
    expiresAt: Timestamp.fromMillis(now + ROUND_TTL_MS),
  });
  await batch.commit();
  return { roundId };
}

interface Verdict {
  error?: string;
  flags: string[];
}

function checkAccuracy(accuracy: number, expected: number): boolean {
  return Math.abs(accuracy - expected) <= 1;
}

/** Game-specific plausibility. Pure: unit-tested without Firestore. */
export function judgeScore(
  gameId: GameId,
  tier: Tier,
  score: number,
  accuracy: number,
  stats: Record<string, unknown>,
  elapsedSeconds: number
): Verdict {
  const flags: string[] = [];
  const bad = (error: string): Verdict => ({ error, flags });
  const num = (k: string) => (isInt(stats[k]) ? (stats[k] as number) : null);

  if (gameId === 'addition-attack' || gameId === 'subtraction-sprint' || gameId === 'multiplication-mastery') {
    const solved = num('solved');
    const attempted = num('attempted');
    const duration = num('durationSeconds');
    const untimed = stats.untimed === true;
    if (solved === null || attempted === null || duration === null) return bad('bad-stats');
    if (solved < 0 || attempted < solved || duration < 1) return bad('bad-stats');
    const bestStreak = num('bestStreak');
    if (bestStreak !== null && (bestStreak < 0 || bestStreak > solved)) return bad('bad-stats');
    const paceSecs = untimed
      ? ARITHMETIC_UNTIMED_MAX_SECONDS
      : ARITHMETIC_PACE_SECONDS[stats.pace as keyof typeof ARITHMETIC_PACE_SECONDS];
    if (!paceSecs) return bad('bad-stats');
    if (duration > paceSecs + 3) return bad('bad-stats');
    const expectedAcc = attempted === 0 ? 0 : Math.round((solved / attempted) * 100);
    if (!checkAccuracy(accuracy, expectedAcc)) return bad('accuracy-mismatch');
    if (score > solved * ARITHMETIC_MAX_POINTS_PER_ANSWER) return bad('score-too-high');
    // Speed: answers cannot outrun a human, nor the wall clock.
    if (solved * ARITHMETIC_MIN_SECONDS_PER_ANSWER > Math.max(duration, elapsedSeconds) + 2) {
      return bad('impossible-speed');
    }
    // The round token starts before the player presses Start, so server elapsed
    // is always >= the played duration (minus clock slack).
    if (elapsedSeconds + 3 < duration * 0.9) return bad('too-fast');
    if (solved / duration > ARITHMETIC_FLAG_ANSWERS_PER_SECOND) flags.push('high-answer-rate');
    if (score > 0.85 * solved * ARITHMETIC_MAX_POINTS_PER_ANSWER && solved >= 10) flags.push('near-max-per-answer');
    return { flags };
  }

  if (gameId === 'daily-challenge') {
    const steps = num('stepsSolved');
    const mistakes = num('mistakes');
    const hints = num('hintsUsed');
    const secondsUsed = num('secondsUsed');
    if (steps === null || mistakes === null || hints === null || secondsUsed === null) return bad('bad-stats');
    if (steps < 0 || steps > 3 || mistakes < 0 || mistakes > 50 || hints < 0 || hints > 20) return bad('bad-stats');
    if (secondsUsed < 0 || secondsUsed > DAILY_TIME_LIMITS[tier] + 3) return bad('bad-stats');
    if (!checkAccuracy(accuracy, Math.round((steps / (3 + mistakes)) * 100))) return bad('accuracy-mismatch');
    const hard = stats.solved === true ? DAILY_HARD_MAX : steps * 50;
    if (score > hard) return bad('score-too-high');
    if (elapsedSeconds + 3 < secondsUsed * 0.9) return bad('too-fast');
    if (score > 0.95 * DAILY_HARD_MAX) flags.push('near-max');
    return { flags };
  }

  // equation-foundry, odds-urns, factor-grid: score vs opponent decides accuracy.
  const opp = num('opponentScore');
  if (opp === null || opp < 0 || opp > 100000) return bad('bad-stats');
  const total = score + opp;
  const okAcc =
    total > 0 ? checkAccuracy(accuracy, Math.round((score / total) * 100)) : accuracy === 50 || accuracy === 100;
  if (!okAcc) return bad('accuracy-mismatch');

  if (gameId === 'equation-foundry') {
    if (score > 5 * 115) return bad('score-too-high');
    if (score > 0.9 * 5 * 115) flags.push('near-max');
  } else if (gameId === 'odds-urns') {
    if (score > ODDS_HARD_MAX) return bad('score-too-high');
    if (score > ODDS_P99) flags.push('above-p99');
  } else {
    const hard = factorGridHardMax(tier);
    if (score > hard) return bad('score-too-high');
    if (score > 0.8 * hard) flags.push('above-p99');
    if (stats.moves !== undefined) {
      if (stats.mode !== 'solo') return bad('bad-stats');
      const r = replayFactorGridSolo(FACTOR_BOARD_MAX[tier], stats.moves, stats.variant === 'prime-trap');
      if (!r.ok) return bad('replay-invalid');
      if (r.playerScore !== score) return bad('replay-mismatch');
      flags.push('replay-verified');
    }
  }
  return { flags };
}

export async function submitScore(deps: Deps, auth: AuthLike | undefined, data: unknown) {
  const { uid } = requireAuth(auth);
  const d = isObj(data) ? data : {};
  const { roundId, score, accuracyPercent } = d;
  const stats = isObj(d.stats) ? d.stats : {};
  if (typeof roundId !== 'string' || !ROUND_ID_RE.test(roundId)) throw new HttpsError('invalid-argument', 'bad-round');
  if (!isInt(score) || score < 0 || score > 100000) throw new HttpsError('invalid-argument', 'bad-score');
  if (!isInt(accuracyPercent) || accuracyPercent < 0 || accuracyPercent > 100) {
    throw new HttpsError('invalid-argument', 'bad-accuracy');
  }
  if (JSON.stringify(stats).length > 4000) throw new HttpsError('invalid-argument', 'bad-stats');
  await requireConsent(deps, uid);
  const now = deps.now();

  const roundRef = deps.db.doc(`rounds/${uid}_${roundId}`);
  const flag = async (reason: string, gameId: string, extra: Record<string, unknown> = {}) => {
    await deps.db.collection('scoreFlags').add({
      uid,
      roundId,
      gameId,
      reason,
      score,
      accuracyPercent,
      createdAt: Timestamp.fromMillis(now),
      ...extra,
    });
  };

  const rs = await roundRef.get();
  const round = rs.data();
  if (!rs.exists || !round || round.uid !== uid) throw new HttpsError('not-found', 'round-not-found');
  if (round.status !== 'open') throw new HttpsError('failed-precondition', 'round-closed');
  const nowTs = Timestamp.fromMillis(now);
  if (nowTs.toMillis() > (round.expiresAt as Timestamp).toMillis()) {
    await roundRef.update({ status: 'expired' });
    throw new HttpsError('failed-precondition', 'round-expired');
  }
  const gameId = round.gameId as GameId;
  const tier = round.tier as Tier;
  const elapsed = (now - (round.startedAt as Timestamp).toMillis()) / 1000;

  const reject = async (code: string, flags: string[]) => {
    // A failed attempt consumes the round so bounds cannot be probed by retrying.
    await roundRef.update({ status: 'rejected', rejectReason: code });
    await flag(code, gameId, { elapsedSeconds: Math.round(elapsed), flags });
    throw new HttpsError('failed-precondition', code);
  };

  if (elapsed < MIN_ROUND_SECONDS[gameId]) return reject('too-fast', []);
  const verdict = judgeScore(gameId, tier, score, accuracyPercent, stats, elapsed);
  if (verdict.error) return reject(verdict.error, verdict.flags);

  // Per-uid daily submission cap (counter shared with startRound).
  const rl = deps.db.doc(`rateLimits/${uid}`);
  const day = dayOf(now);
  const dateKey = day;
  const scoreId = `${uid}_${gameId}_${dateKey}`;
  const scoreRef = deps.db.doc(`gameScores/${scoreId}`);

  // Name comes from the profile, never from the client; re-moderated here.
  const userSnap = await deps.db.doc(`users/${uid}`).get();
  const stored = userSnap.exists ? userSnap.data()?.displayName : undefined;
  const nameCheck = validateDisplayName(stored);
  const displayName = nameCheck.ok ? nameCheck.clean : suggestSafeName(uid);
  const nameBlocked = !nameCheck.ok;

  const result = await deps.db.runTransaction(async (tx) => {
    const [r, rlSnap, prev] = await Promise.all([tx.get(roundRef), tx.get(rl), tx.get(scoreRef)]);
    if (!r.exists || r.data()?.status !== 'open') throw new HttpsError('failed-precondition', 'round-closed');
    const rlData = rlSnap.exists ? rlSnap.data()! : {};
    const submits = rlData.day === day ? (rlData.submits as number) ?? 0 : 0;
    if (submits >= RATE.submitsPerDay) throw new HttpsError('resource-exhausted', 'daily-submit-cap');
    tx.set(
      rl,
      { day, submits: submits + 1, starts: rlData.day === day ? rlData.starts ?? 0 : 0 },
      { merge: true }
    );
    tx.update(roundRef, { status: 'closed', closedAt: nowTs, score });
    const best = prev.exists ? (prev.data()!.score as number) : -1;
    if (best >= score) return { saved: false, best };
    tx.set(scoreRef, {
      uid,
      displayName,
      gameId,
      gameTitle: GAME_TITLES[gameId],
      tier,
      score,
      accuracyPercent,
      dateKey,
      createdAt: nowTs,
    });
    return { saved: true, best: score };
  });

  for (const f of [...verdict.flags.filter((x) => x !== 'replay-verified'), ...(nameBlocked ? ['name-blocked'] : [])]) {
    await flag(f, gameId, { elapsedSeconds: Math.round(elapsed), severity: 'review' });
  }
  return { ...result, scoreId, dateKey, flagged: verdict.flags.length > 0 };
}
