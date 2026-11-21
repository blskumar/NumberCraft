// Integration tests against the Firestore EMULATOR (never a live project).
// Run: functions/README.md ("Tests"). Requires FIRESTORE_EMULATOR_HOST.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { CONSENT_VERSION, sha256, type AuthLike, type Deps } from '../src/common';
import { applyConsentDecision, eraseUserData, previewConsentToken, recordSelfConsent, requestParentalConsent, withdrawConsent } from '../src/consent';
import { renderConsentPage } from '../src/consent-page';
import { MemoryMailer } from '../src/mailer';
import { judgeScore, startRound, submitScore } from '../src/scores';
import { replayFactorGridSolo } from '../src/replay';

assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'run under the Firestore emulator');
initializeApp({ projectId: 'demo-nc-fn' });
const db = getFirestore();

const clock = { t: Date.parse('2026-11-21T10:00:00Z') };
const mailer = new MemoryMailer();
const deps: Deps = { db, now: () => clock.t, mailer, consentBaseUrl: 'https://x.test/confirm', archiveSalt: 'test-salt' };
let n = 0;
const uid = () => `u${Date.now().toString(36)}${n++}`;
const A = (u: string, verified = true, email = `${u}@child.test`): AuthLike => ({ uid: u, token: { email_verified: verified, email } });
const adv = (s: number) => (clock.t += s * 1000);
const code = async (p: Promise<unknown>) => {
  try { await p; return 'ok'; } catch (e) { return (e as { message: string }).message; }
};

async function seed(u: string, o: { name?: string; consent?: 'granted' | 'pending-parental-consent' | 'withdrawn' | 'none'; version?: string } = {}) {
  await db.doc(`users/${u}`).set({ uid: u, displayName: o.name ?? 'Ann Otter', email: `${u}@child.test`, ageTier: 'explorers', dailyProblemGoal: 10 });
  if (o.consent !== 'none') {
    await db.doc(`consents/${u}`).set({ uid: u, ageBand: 'adult', status: o.consent ?? 'granted', version: o.version ?? CONSENT_VERSION });
  }
}
const arith = (o: Record<string, unknown> = {}) => ({ solved: 20, attempted: 22, durationSeconds: 60, pace: 'standard', bestStreak: 8, ...o });
async function playArith(u: string, o: { score?: number; acc?: number; stats?: Record<string, unknown>; wait?: number } = {}) {
  const { roundId } = await startRound(deps, A(u), { gameId: 'addition-attack', tier: 'explorers' });
  adv(o.wait ?? 61);
  return { roundId, run: () => submitScore(deps, A(u), { roundId, score: o.score ?? 400, accuracyPercent: o.acc ?? 91, stats: o.stats ?? arith() }) };
}

// ---------- score functions ----------
test('happy path: startRound -> submitScore writes server-owned score doc', async () => {
  const u = uid();
  await seed(u);
  const { roundId, run } = await playArith(u);
  const r = await run();
  assert.equal(r.saved, true);
  assert.equal(r.dateKey, '2026-11-21'); // from SERVER clock
  const s = (await db.doc(`gameScores/${u}_addition-attack_2026-11-21`).get()).data()!;
  assert.equal(s.score, 400);
  assert.equal(s.displayName, 'Ann Otter');
  assert.equal(s.gameTitle, 'Addition Attack');
  assert.equal((await db.doc(`rounds/${u}_${roundId}`).get()).data()!.status, 'closed');
});

test('client-supplied displayName/dateKey are ignored', async () => {
  const u = uid();
  await seed(u);
  const { roundId } = await startRound(deps, A(u), { gameId: 'addition-attack', tier: 'explorers' });
  adv(61);
  await submitScore(deps, A(u), { roundId, score: 300, accuracyPercent: 91, stats: arith(), displayName: 'Admin', dateKey: '2099-01-01', uid: 'victim' });
  assert.equal((await db.doc(`gameScores/${u}_addition-attack_2026-11-21`).get()).data()!.displayName, 'Ann Otter');
});

test('replay of a used roundId is rejected', async () => {
  const u = uid();
  await seed(u);
  const { roundId, run } = await playArith(u);
  await run();
  assert.equal(await code(submitScore(deps, A(u), { roundId, score: 400, accuracyPercent: 91, stats: arith() })), 'round-closed');
});

test('forged score above the hard bound is rejected, flagged and consumes the round', async () => {
  const u = uid();
  await seed(u);
  const { roundId, run } = await playArith(u, { score: 99999 });
  assert.equal(await code(run()), 'score-too-high');
  const flags = await db.collection('scoreFlags').where('uid', '==', u).get();
  assert.equal(flags.size, 1);
  assert.equal(flags.docs[0].data().reason, 'score-too-high');
  assert.equal(await code(submitScore(deps, A(u), { roundId, score: 100, accuracyPercent: 91, stats: arith() })), 'round-closed');
  assert.equal((await db.doc(`gameScores/${u}_addition-attack_2026-11-21`).get()).exists, false);
});

test('too-fast round is rejected and flagged', async () => {
  const u = uid();
  await seed(u);
  const { run } = await playArith(u, { wait: 1 });
  assert.equal(await code(run()), 'too-fast');
  assert.equal((await db.collection('scoreFlags').where('uid', '==', u).get()).docs[0].data().reason, 'too-fast');
});

test('unverified email cannot start or submit', async () => {
  const u = uid();
  await seed(u);
  assert.equal(await code(startRound(deps, A(u, false), { gameId: 'addition-attack', tier: 'explorers' })), 'email-not-verified');
  assert.equal(await code(submitScore(deps, A(u, false), { roundId: 'a'.repeat(24), score: 1, accuracyPercent: 1, stats: {} })), 'email-not-verified');
  assert.equal(await code(startRound(deps, undefined, { gameId: 'addition-attack', tier: 'explorers' })), 'sign-in-required');
});

test('wrong owner cannot submit someone else\'s round', async () => {
  const [a, b] = [uid(), uid()];
  await seed(a);
  await seed(b);
  const { roundId } = await playArith(a);
  assert.equal(await code(submitScore(deps, A(b), { roundId, score: 400, accuracyPercent: 91, stats: arith() })), 'round-not-found');
  assert.equal((await db.doc(`rounds/${a}_${roundId}`).get()).data()!.status, 'open');
});

test('rate limits: start gap and daily submit cap', async () => {
  const u = uid();
  await seed(u);
  await startRound(deps, A(u), { gameId: 'odds-urns', tier: 'explorers' });
  assert.equal(await code(startRound(deps, A(u), { gameId: 'odds-urns', tier: 'explorers' })), 'too-many-rounds');
  adv(3);
  await startRound(deps, A(u), { gameId: 'odds-urns', tier: 'explorers' });
  // daily submit cap
  const v = uid();
  await seed(v);
  const { run } = await playArith(v);
  await db.doc(`rateLimits/${v}`).set({ day: '2026-11-21', submits: 60, starts: 1 }, { merge: true });
  assert.equal(await code(run()), 'daily-submit-cap');
});

test('best-of-day per uid+game: lower ignored, higher replaces', async () => {
  const u = uid();
  await seed(u);
  const ref = db.doc(`gameScores/${u}_addition-attack_2026-11-21`);
  assert.equal((await (await playArith(u, { score: 300 })).run()).saved, true);
  assert.equal((await (await playArith(u, { score: 200, wait: 61 })).run()).saved, false);
  assert.equal((await ref.get()).data()!.score, 300);
  assert.equal((await (await playArith(u, { score: 350 })).run()).saved, true);
  assert.equal((await ref.get()).data()!.score, 350);
});

test('one open round per uid+game: new start supersedes the old one', async () => {
  const u = uid();
  await seed(u);
  const first = await startRound(deps, A(u), { gameId: 'factor-grid', tier: 'explorers' });
  adv(3);
  await startRound(deps, A(u), { gameId: 'factor-grid', tier: 'explorers' });
  assert.equal((await db.doc(`rounds/${u}_${first.roundId}`).get()).data()!.status, 'superseded');
  adv(20);
  assert.equal(await code(submitScore(deps, A(u), { roundId: first.roundId, score: 10, accuracyPercent: 50, stats: { opponentScore: 10 } })), 'round-closed');
});

test('expired round is rejected', async () => {
  const u = uid();
  await seed(u);
  const { run } = await playArith(u, { wait: 3 * 3600 + 5 });
  assert.equal(await code(run()), 'round-expired');
});

test('profile name is re-moderated server-side; blocked names get a safe fallback + flag', async () => {
  const u = uid();
  await seed(u, { name: 'fuck' });
  await (await playArith(u)).run();
  const s = (await db.doc(`gameScores/${u}_addition-attack_2026-11-21`).get()).data()!;
  assert.match(s.displayName, /^[A-Z][a-z]+ [A-Z][a-z]+ \d{2}$/);
  const flags = (await db.collection('scoreFlags').where('uid', '==', u).get()).docs.map((d) => d.data().reason);
  assert.ok(flags.includes('name-blocked'));
});

test('accuracy inconsistent with stats is rejected; impossible speed is rejected', async () => {
  const u = uid();
  await seed(u);
  assert.equal(await code((await playArith(u, { acc: 100 })).run()), 'accuracy-mismatch');
  adv(3);
  assert.equal(await code((await playArith(u, { stats: arith({ solved: 500, attempted: 500 }), acc: 100, score: 9000 })).run()), 'impossible-speed');
});

test('bad input shapes', async () => {
  const u = uid();
  await seed(u);
  assert.equal(await code(startRound(deps, A(u), { gameId: 'nope', tier: 'explorers' })), 'bad-game');
  assert.equal(await code(startRound(deps, A(u), { gameId: 'odds-urns', tier: 'x' })), 'bad-tier');
  assert.equal(await code(submitScore(deps, A(u), { roundId: '../x', score: 1, accuracyPercent: 1, stats: {} })), 'bad-round');
  assert.equal(await code(submitScore(deps, A(u), { roundId: 'a'.repeat(24), score: 1.5, accuracyPercent: 1, stats: {} })), 'bad-score');
});

// ---------- consent gating ----------
test('no / pending / withdrawn / stale consent blocks startRound and submitScore', async () => {
  for (const [c, version] of [['none'], ['pending-parental-consent'], ['withdrawn'], ['granted', '2020-old']] as const) {
    const u = uid();
    await seed(u, { consent: c, version });
    assert.equal(await code(startRound(deps, A(u), { gameId: 'addition-attack', tier: 'explorers' })), 'consent-required', c);
    assert.equal(await code(submitScore(deps, A(u), { roundId: 'a'.repeat(24), score: 1, accuracyPercent: 1, stats: {} })), 'consent-required', c);
  }
});

// ---------- parental consent flow ----------
const tokenFrom = (text: string) => decodeURIComponent(/[?&]t=([^&\s]+)/.exec(text)![1]);

test('consent flow: request -> pending blocks scores -> parent yes -> scores work -> withdraw link erases', async () => {
  const u = uid();
  await seed(u, { consent: 'none' });
  mailer.sent.length = 0;
  assert.equal((await requestParentalConsent(deps, A(u), { parentEmail: 'Parent@Mail.test' })).status, 'pending-parental-consent');
  assert.equal(mailer.sent.length, 1);
  assert.equal(mailer.sent[0].to, 'parent@mail.test');
  const token = tokenFrom(mailer.sent[0].text);
  const reqDoc = (await db.doc(`consentRequests/${sha256(token)}`).get()).data()!;
  assert.equal(reqDoc.uid, u);
  assert.ok(!JSON.stringify(reqDoc).includes(token), 'raw token never stored');
  assert.equal((await db.doc(`consents/${u}`).get()).data()!.status, 'pending-parental-consent');
  assert.equal(await code(startRound(deps, A(u), { gameId: 'addition-attack', tier: 'explorers' })), 'consent-required');
  assert.deepEqual(await previewConsentToken(deps, token), { type: 'parent', displayName: 'Ann Otter' });

  assert.equal(await applyConsentDecision(deps, token, 'yes'), 'granted');
  const c = (await db.doc(`consents/${u}`).get()).data()!;
  assert.equal(c.status, 'granted');
  assert.equal(c.method, 'parent-email-link');
  assert.equal(c.version, CONSENT_VERSION);
  assert.equal(await applyConsentDecision(deps, token, 'yes'), 'invalid', 'single use');
  assert.equal((await db.collection('consentRequests').where('uid', '==', u).where('type', '==', 'parent').get()).size, 0);

  adv(3);
  assert.equal((await (await playArith(u)).run()).saved, true);

  // receipt email carries a withdraw link
  const receipt = mailer.sent[1];
  assert.match(receipt.text, /&w=1/);
  const wtoken = tokenFrom(receipt.text);
  assert.equal(await applyConsentDecision(deps, wtoken, 'withdraw'), 'withdrawn');
  assert.equal((await db.doc(`consents/${u}`).get()).data()!.status, 'withdrawn');
  assert.equal((await db.collection('gameScores').where('uid', '==', u).get()).size, 0);
  assert.equal(await code(startRound(deps, A(u), { gameId: 'addition-attack', tier: 'explorers' })), 'consent-required');
});

test('consent: parent declines; expired token; unknown token', async () => {
  const u = uid();
  await seed(u, { consent: 'none' });
  mailer.sent.length = 0;
  await requestParentalConsent(deps, A(u), { parentEmail: 'p1@mail.test' });
  assert.equal(await applyConsentDecision(deps, tokenFrom(mailer.sent[0].text), 'no'), 'declined');
  assert.equal((await db.doc(`consents/${u}`).get()).data()!.status, 'declined');

  const v = uid();
  await seed(v, { consent: 'none' });
  await requestParentalConsent(deps, A(v), { parentEmail: 'p2@mail.test' });
  const t = tokenFrom(mailer.sent[1].text);
  adv(8 * 24 * 3600);
  assert.equal(await previewConsentToken(deps, t), null);
  assert.equal(await applyConsentDecision(deps, t, 'yes'), 'expired');
  assert.equal((await db.doc(`consents/${v}`).get()).data()!.status, 'expired');
  assert.equal(await applyConsentDecision(deps, 'x'.repeat(43), 'yes'), 'invalid');
});

test('consent: validation and rate limits', async () => {
  const u = uid();
  await seed(u, { consent: 'none' });
  assert.equal(await code(requestParentalConsent(deps, A(u), { parentEmail: 'nope' })), 'bad-parent-email');
  assert.equal(await code(requestParentalConsent(deps, A(u, true, 'same@x.test'), { parentEmail: 'SAME@x.test' })), 'parent-email-same-as-child');
  assert.equal(await code(requestParentalConsent(deps, undefined, { parentEmail: 'a@b.co' })), 'sign-in-required');
  for (let i = 0; i < 3; i++) assert.equal(await code(requestParentalConsent(deps, A(u), { parentEmail: `r${i}@m.test` })), 'ok');
  assert.equal(await code(requestParentalConsent(deps, A(u), { parentEmail: 'r9@m.test' })), 'consent-rate-limit');
  // per-parent cap: 5 children to one parent address per day
  const parent = `shared${Date.now()}@m.test`;
  for (let i = 0; i < 5; i++) {
    const k = uid();
    await seed(k, { consent: 'none' });
    assert.equal(await code(requestParentalConsent(deps, A(k), { parentEmail: parent })), 'ok');
  }
  const k = uid();
  await seed(k, { consent: 'none' });
  assert.equal(await code(requestParentalConsent(deps, A(k), { parentEmail: parent })), 'consent-rate-limit');
});

test('consent: mail failure leaves no usable request', async () => {
  const u = uid();
  await seed(u, { consent: 'none' });
  const failing: Deps = { ...deps, mailer: { send: async () => { throw new Error('boom'); } } };
  assert.equal(await code(requestParentalConsent(failing, A(u), { parentEmail: 'q@m.test' })), 'email-unavailable');
  assert.equal((await db.collection('consentRequests').where('uid', '==', u).get()).size, 0);
});

test('adults: recordSelfConsent grants; cannot override a minor record', async () => {
  const u = uid();
  await seed(u, { consent: 'none' });
  await recordSelfConsent(deps, A(u, false));
  assert.equal((await db.doc(`consents/${u}`).get()).data()!.method, 'self');
  const m = uid();
  await seed(m, { consent: 'none' });
  await requestParentalConsent(deps, A(m), { parentEmail: 'pp@m.test' });
  assert.equal(await code(recordSelfConsent(deps, A(m))), 'parent-consent-required');
});

test('withdrawConsent (self) withdraws and erases scores; eraseUserData archives consent and removes data', async () => {
  const u = uid();
  await seed(u);
  await (await playArith(u)).run();
  await withdrawConsent(deps, A(u));
  assert.equal((await db.collection('gameScores').where('uid', '==', u).get()).size, 0);
  assert.equal((await db.doc(`consents/${u}`).get()).data()!.status, 'withdrawn');

  await db.doc(`scoreFlags/f_${u}`).set({ uid: u });
  await db.collection('consentRequests').doc(`r_${u}`).set({ uid: u, type: 'parent', expiresAt: new Date(), parentEmail: 'x@y.z' });
  await eraseUserData(deps, u);
  assert.equal((await db.doc(`consents/${u}`).get()).exists, false);
  assert.equal((await db.doc(`users/${u}`).get()).exists, false);
  assert.equal((await db.collection('consentRequests').where('uid', '==', u).get()).size, 0);
  assert.equal((await db.collection('scoreFlags').where('uid', '==', u).get()).size, 0);
  const arch = (await db.doc(`consentArchive/${sha256('test-salt' + u)}`).get()).data()!;
  assert.equal(arch.status, 'erased');
  assert.ok(!JSON.stringify(arch).includes(u));
});

// ---------- pure plausibility ----------
test('judgeScore: per-game bounds', () => {
  assert.equal(judgeScore('equation-foundry', 'explorers', 575, 100, { opponentScore: 0 }, 60).error, undefined);
  assert.equal(judgeScore('equation-foundry', 'explorers', 576, 100, { opponentScore: 0 }, 60).error, 'score-too-high');
  assert.equal(judgeScore('odds-urns', 'explorers', 2501, 100, { opponentScore: 0 }, 60).error, 'score-too-high');
  assert.deepEqual(judgeScore('odds-urns', 'explorers', 700, 100, { opponentScore: 0 }, 60).flags, ['above-p99']);
  assert.equal(judgeScore('odds-urns', 'explorers', 100, 38, { opponentScore: 160 }, 60).error, undefined);
  assert.equal(judgeScore('odds-urns', 'explorers', 100, 90, { opponentScore: 160 }, 60).error, 'accuracy-mismatch');
  assert.equal(judgeScore('factor-grid', 'explorers', 235, 100, { opponentScore: 0 }, 60).error, 'score-too-high'); // 20-board: 210 + 8 primes x 3 = 234
});

test('judgeScore: daily bounds and stats', () => {
  const ok = { stepsSolved: 3, mistakes: 0, hintsUsed: 0, secondsUsed: 40, solved: true };
  assert.equal(judgeScore('daily-challenge', 'explorers', 350, 100, ok, 60).error, undefined);
  assert.equal(judgeScore('daily-challenge', 'explorers', 376, 100, ok, 60).error, 'score-too-high');
  assert.equal(judgeScore('daily-challenge', 'explorers', 200, 100, { ...ok, solved: false, stepsSolved: 3 }, 60).error, 'score-too-high');
  assert.equal(judgeScore('daily-challenge', 'explorers', 100, 100, { ...ok, secondsUsed: 500 }, 600).error, 'bad-stats');
});

test('Factor Grid solo replay verifies a real game and rejects forged ones', async () => {
  // 20-board: claim 20,18,... verified via legality rules
  const moves = [] as number[];
  // greedy legal play
  const owner: string[] = Array(21).fill('u');
  const divs = (m: number) => Array.from({ length: m - 1 }, (_, i) => i + 1).filter((d) => m % d === 0 && owner[d] === 'u');
  for (;;) {
    let pick = 0;
    for (let m = 20; m >= 2; m--) if (owner[m] === 'u' && divs(m).length) { pick = m; break; }
    if (!pick) break;
    divs(pick).forEach((d) => (owner[d] = 't'));
    owner[pick] = 'p';
    moves.push(pick);
  }
  const r = replayFactorGridSolo(20, moves, false);
  assert.equal(r.ok, true);
  assert.equal(replayFactorGridSolo(20, [...moves, 7], false).ok, false);
  assert.equal(replayFactorGridSolo(20, moves.slice(0, 2), false).reason, 'incomplete-game');
  assert.equal(replayFactorGridSolo(20, [1], false).ok, false);
  const u = uid();
  await seed(u);
  const { roundId } = await startRound(deps, A(u), { gameId: 'factor-grid', tier: 'explorers' });
  adv(60);
  assert.equal(await code(submitScore(deps, A(u), { roundId, score: r.playerScore + 5, accuracyPercent: 100, stats: { opponentScore: 0, mode: 'solo', moves } })), 'replay-mismatch');
  adv(3);
  const { roundId: id2 } = await startRound(deps, A(u), { gameId: 'factor-grid', tier: 'explorers' });
  adv(60);
  const ok = await submitScore(deps, A(u), { roundId: id2, score: r.playerScore, accuracyPercent: Math.round((r.playerScore / (r.playerScore + 10)) * 100), stats: { opponentScore: 10, mode: 'solo', moves } });
  assert.equal(ok.saved, true);
});

test('consent page escapes names', () => {
  const html = renderConsentPage({ kind: 'ask', token: 'tok', displayName: '<img src=x onerror=1>' });
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('&lt;img'));
  assert.ok(!/<script/i.test(html));
});
