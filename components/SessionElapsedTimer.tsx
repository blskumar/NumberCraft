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
  const formatted = formatElapsedSessionClock(elapsedSeconds);

  return (
    <div
      data-testid="session-elapsed-timer"
      role="timer"
      aria-label={`${arenaName} session elapsed time: ${formatted}`}
      className="pointer-events-none fixed right-4 top-[142px] z-20 sm:right-6 md:top-[106px] lg:right-8"
    >
      <div className="pointer-events-auto inline-flex items-center gap-2 rounded-lg border border-[#DDD5C7] bg-[#FAF8F4]/95 px-2.5 py-1.5 text-xs text-[#46515E] shadow-[0_4px_12px_rgba(28,35,43,0.08)] backdrop-blur-xs">
        <Timer
          className="h-3.5 w-3.5 shrink-0 text-[#1D4ED8]"
          aria-hidden="true"
        />
        <span className="hidden sm:inline font-medium text-[#5A6572]">
          Session
        </span>
        <span
          data-testid="session-elapsed-clock"
          className="font-mono font-semibold text-[#1C232B] tabular-nums"
        >
          {formatted}
        </span>
      </div>
    </div>
  );
}
