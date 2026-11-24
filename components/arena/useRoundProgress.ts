import { useEffect } from 'react';

export interface RoundProgress {
  solved: number;
  attempted: number;
}

/**
 * Reports the in-flight (not yet recorded) round to the session tracker so the
 * End-of-Session summary counts questions answered in an abandoned round.
 * It is a snapshot, not a delta: zero whenever the round is not being played,
 * so a finished round (already counted via its match record) is never doubled.
 */
export function useRoundProgress(
  report: ((p: RoundProgress) => void) | undefined,
  active: boolean,
  solved: number,
  attempted: number
) {
  useEffect(() => {
    report?.(active ? { solved, attempted } : { solved: 0, attempted: 0 });
  }, [report, active, solved, attempted]);
}
