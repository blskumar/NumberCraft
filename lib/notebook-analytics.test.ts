import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildModeBreakdown,
  buildTierBreakdown,
  buildTimelineSeries,
  computeTrendSummary,
  createSampleMatches,
  filterMatches,
  isSampleMatch,
} from './notebook-analytics';

test('filterMatches filters accurately by mode and age tier', () => {
  const sample = createSampleMatches();
  assert.equal(filterMatches(sample, 'all', 'all').length, 9);
  assert.equal(filterMatches(sample, 'vs-ai', 'all').length, 4);
  assert.equal(filterMatches(sample, 'all', 'explorers').length, 3);
  assert.equal(filterMatches(sample, 'local', 'strategists').length, 0);
  assert.equal(filterMatches(sample, 'solo', 'challengers').length, 1);
});

test('buildTimelineSeries sorts matches chronologically and calculates exact margins', () => {
  const sample = createSampleMatches();
  const reversed = [...sample].reverse();
  const series = buildTimelineSeries(reversed);

  assert.equal(series.length, 9);
  assert.equal(series[0].label, '#1');
  assert.equal(series[0].playerScore, 98);
  assert.equal(series[0].scoreMargin, -14);
  assert.equal(series[8].label, '#9');
  assert.equal(series[8].playerScore, 668);
  assert.equal(series[8].scoreMargin, 96);
});

test('buildTierBreakdown and buildModeBreakdown aggregate averages and win rates correctly', () => {
  const sample = createSampleMatches();
  const tiers = buildTierBreakdown(sample);
  assert.equal(tiers.length, 3);
  assert.equal(tiers[0].key, 'explorers');
  assert.equal(tiers[0].matches, 3);
  assert.equal(tiers[0].wins, 2);
  assert.equal(tiers[0].winRate, 67);
  assert.equal(tiers[0].avgScore, Math.round((98 + 118 + 126) / 3));

  const modes = buildModeBreakdown(sample);
  assert.equal(modes.length, 3);
  const vsAi = modes.find((b) => b.key === 'vs-ai');
  assert.ok(vsAi);
  assert.equal(vsAi.matches, 4);
  assert.equal(vsAi.wins, 3);
  assert.equal(vsAi.winRate, 75);
});

test('computeTrendSummary detects positive improvement and handles empty/single input safely', () => {
  assert.deepEqual(computeTrendSummary([]), {
    hasTrend: false,
    scoreDelta: 0,
    winRatePercent: 0,
    avgScore: 0,
    avgMargin: 0,
  });

  const sample = createSampleMatches();
  const series = buildTimelineSeries(sample);
  const summary = computeTrendSummary(series);
  assert.equal(summary.hasTrend, true);
  assert.ok(summary.scoreDelta > 0);
  assert.equal(summary.winRatePercent, Math.round((6 / 9) * 100));

  const singleSummary = computeTrendSummary(series.slice(0, 1));
  assert.equal(singleSummary.hasTrend, false);
  assert.equal(singleSummary.avgScore, 98);
});

test('sample matches are tagged cleanly for selective clearing', () => {
  const sample = createSampleMatches();
  assert.ok(sample.every((m) => isSampleMatch(m)));
});
