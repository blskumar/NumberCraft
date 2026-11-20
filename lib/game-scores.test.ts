import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSanitizedScorePayload,
  computeTopTenLeaderboard,
  formatIsoWeekRange,
  getIsoWeekKey,
  type CloudGameScoreRecord,
} from './game-scores';

describe('Per-Game Cloud Scores & Top 10 Day/Week Leaderboards (lib/game-scores.ts)', () => {
  it('computes accurate ISO week keys and human-readable date ranges', () => {
    assert.equal(getIsoWeekKey('2026-11-20'), '2026-W47');
    assert.equal(getIsoWeekKey('2026-11-16'), '2026-W47');
    assert.equal(getIsoWeekKey('2026-11-22'), '2026-W47');
    assert.equal(getIsoWeekKey('2026-11-23'), '2026-W48');
    assert.equal(formatIsoWeekRange('2026-11-20'), 'Nov 16 – Nov 22');
  });

  it('sanitizes outgoing score payloads to strictly match blueprint constraints', () => {
    const payload = buildSanitizedScorePayload({
      uid: 'user_abc',
      displayName: '   Avery With A Very Long Display Name Exceeding Limit   ',
      gameId: 'equation-foundry',
      tier: 'strategists',
      score: 120000,
      accuracyPercent: 108,
      dateKey: '2026-11-20',
    });

    assert.equal(payload.displayName.length, 28);
    assert.equal(payload.score, 100000);
    assert.equal(payload.accuracyPercent, 100);
    assert.equal(payload.weekKey, '2026-W47');
    assert.equal(payload.visibility, 'public');
  });

  it('ranks Top 10 individuals per day and week, deduplicating to each player best score', () => {
    const records: CloudGameScoreRecord[] = Array.from({ length: 12 }, (_, idx) => ({
      id: `rec-${idx}`,
      uid: `u${idx + 1}`,
      displayName: `Player ${idx + 1}`,
      gameId: 'addition-attack',
      gameTitle: 'Addition Attack',
      tier: 'challengers',
      score: 100 + idx * 15,
      accuracyPercent: 90,
      dateKey: idx < 11 ? '2026-11-20' : '2026-11-18', // 11 today, 1 earlier same week
      weekKey: '2026-W47',
      visibility: 'public',
      createdAtMs: 1000 + idx,
    }));

    // Add a second, higher score for u1 today to verify deduplication keeps best
    records.push({
      id: 'rec-u1-best',
      uid: 'u1',
      displayName: 'Player 1',
      gameId: 'addition-attack',
      gameTitle: 'Addition Attack',
      tier: 'challengers',
      score: 420,
      accuracyPercent: 98,
      dateKey: '2026-11-20',
      weekKey: '2026-W47',
      visibility: 'public',
      createdAtMs: 2000,
    });

    const dayBoard = computeTopTenLeaderboard({
      records,
      period: 'day',
      gameFilter: 'addition-attack',
      todayKey: '2026-11-20',
      currentUserUid: 'u1',
    });

    assert.equal(dayBoard.topTen.length, 10);
    assert.equal(dayBoard.totalPlayersInPeriod, 11);
    assert.equal(dayBoard.topTen[0].uid, 'u1');
    assert.equal(dayBoard.topTen[0].score, 420);
    assert.equal(dayBoard.topTen[0].gamesPlayedInPeriod, 2);
    assert.equal(dayBoard.topTen[0].isCurrentUser, true);
    assert.equal(dayBoard.currentUserRow?.rank, 1);

    const weekBoard = computeTopTenLeaderboard({
      records,
      period: 'week',
      gameFilter: 'addition-attack',
      todayKey: '2026-11-20',
      currentUserUid: 'u12',
    });

    assert.equal(weekBoard.topTen.length, 10);
    assert.equal(weekBoard.totalPlayersInPeriod, 12);
    assert.equal(weekBoard.currentUserRow?.uid, 'u12');
    assert.equal(weekBoard.currentUserRow?.rank, 2); // u1=420, u12=265
  });
});
