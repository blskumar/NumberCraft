'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { StudioTab } from '@/components/TopNav';
import { isActiveGameTab, type ArenaSessionStats } from '@/lib/session-tracker';

const EMPTY_ACCUMULATOR = () => ({
  problemsSolved: 0,
  problemsAttempted: 0,
  matchesRecorded: 0,
  newlyEarnedSeals: [] as string[],
});

/** Persistent elapsed session clock + per-arena metric accumulator + pending End-of-Session modal state. */
export function useSessionTracking(activeTab: StudioTab) {
  const [sessionElapsedSeconds, setSessionElapsedSeconds] = useState(0);
  const [pendingLeaveTab, setPendingLeaveTab] = useState<StudioTab | null>(null);
  const [pendingSessionSummary, setPendingSessionSummary] =
    useState<ArenaSessionStats | null>(null);
  const sessionAccumulatorRef = useRef(EMPTY_ACCUMULATOR());

  const inActiveGameArena = isActiveGameTab(activeTab);

  useEffect(() => {
    if (!inActiveGameArena || pendingLeaveTab !== null) return;
    const id = window.setInterval(() => {
      setSessionElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [inActiveGameArena, pendingLeaveTab]);

  const resetArenaSession = useCallback(() => {
    setSessionElapsedSeconds(0);
    sessionAccumulatorRef.current = EMPTY_ACCUMULATOR();
  }, []);

  return {
    inActiveGameArena,
    sessionElapsedSeconds,
    sessionAccumulatorRef,
    resetArenaSession,
    pendingLeaveTab,
    setPendingLeaveTab,
    pendingSessionSummary,
    setPendingSessionSummary,
  };
}

export type SessionTracking = ReturnType<typeof useSessionTracking>;
