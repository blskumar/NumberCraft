// Deterministic server-side replay for Factor Grid SOLO mode ("Taxman").
// Rules mirror lib/factor-grid-engine.ts (previewMove/applyMove): a legal move
// is an unclaimed tile >= 2 with at least one unclaimed proper divisor; the
// player scores the tile (+3 prime bonus in the prime-trap variant) and the
// Taxman takes the unclaimed proper divisors. lib/server-limits.test.ts replays
// random engine games and asserts equality with the real engine.

export interface ReplayResult {
  ok: boolean;
  playerScore: number;
  reason?: string;
}

function properDivisors(n: number): number[] {
  if (n <= 1) return [];
  const out = [1];
  for (let d = 2; d * d <= n; d++) {
    if (n % d === 0) {
      out.push(d);
      if (d !== n / d) out.push(n / d);
    }
  }
  return out;
}

function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
}

export function replayFactorGridSolo(
  boardMax: number,
  moves: unknown,
  primeTrap: boolean
): ReplayResult {
  if (!Array.isArray(moves) || moves.length === 0 || moves.length > boardMax) {
    return { ok: false, playerScore: 0, reason: 'bad-moves' };
  }
  const owner = new Array<'u' | 'p' | 't'>(boardMax + 1).fill('u');
  let score = 0;
  for (const m of moves) {
    if (!Number.isInteger(m) || m < 2 || m > boardMax || owner[m] !== 'u') {
      return { ok: false, playerScore: 0, reason: 'illegal-move' };
    }
    const divs = properDivisors(m).filter((d) => owner[d] === 'u');
    if (divs.length === 0) return { ok: false, playerScore: 0, reason: 'illegal-move' };
    owner[m] = 'p';
    for (const d of divs) owner[d] = 't';
    score += m + (primeTrap && isPrime(m) ? 3 : 0);
  }
  // The game only ends when no legal move remains.
  for (let n = 2; n <= boardMax; n++) {
    if (owner[n] === 'u' && properDivisors(n).some((d) => owner[d] === 'u')) {
      return { ok: false, playerScore: score, reason: 'incomplete-game' };
    }
  }
  return { ok: true, playerScore: score };
}
