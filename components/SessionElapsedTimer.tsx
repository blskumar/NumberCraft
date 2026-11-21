'use client';

import { Timer } from 'lucide-react';
import { formatElapsedSessionClock } from '@/lib/session-tracker';

interface SessionElapsedTimerProps {
  elapsedSeconds: number;
  arenaName: string;
}

export default function SessionElapsedTimer({
  elapsedSeconds,
  arenaName,
}: SessionElapsedTimerProps) {
  const safe = Number.isFinite(elapsedSeconds) ? elapsedSeconds : 0;
  const formatted = formatElapsedSessionClock(safe);

  // In normal flow (not fixed) so it can never cover header or page controls,
  // whatever height the header wraps to.
  return (
    <aside
      aria-label="Session timer"
      className="mx-auto flex max-w-[1240px] justify-end px-4 pt-2 sm:px-6 lg:px-8"
    >
      <div
        data-testid="session-elapsed-timer"
        role="timer"
        aria-label={`${arenaName} session elapsed time: ${formatted}`}
      >
        <div className="inline-flex items-center gap-2 rounded-lg border border-[#DDD5C7] bg-[#FAF8F4] px-2.5 py-1.5 text-xs text-[#46515E]">
          <Timer className="h-3.5 w-3.5 shrink-0 text-[#1D4ED8]" aria-hidden="true" />
          <span className="hidden sm:inline font-medium text-[#5A6572]">Session</span>
          <span
            data-testid="session-elapsed-clock"
            className="font-mono font-semibold text-[#1C232B] tabular-nums"
          >
            {formatted}
          </span>
        </div>
      </div>
    </aside>
  );
}
