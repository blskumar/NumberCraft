'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { StudioTab } from '@/components/TopNav';
import type { AchievementEvaluation } from '@/lib/achievements';
import {
  computeEffectiveGuestTrials,
  isGuestGameLocked,
  type PlayableGameId,
} from '@/lib/guest-trial';
import {
  buildEndOfSessionSummary,
  isActiveGameTab,
} from '@/lib/session-tracker';
import { getStudioTabA11yMeta } from '@/lib/studio-a11y';
import type { ArithmeticGameId } from '@/lib/types';
import { resolveGameIdForTab, TAB_DEST_LABELS } from './appHelpers';
import type { AppData } from './useAppData';
import type { SessionTracking } from './useSessionTracking';

/**
 * Tab navigation. Enforces the 1-free-level-per-game guest trial gate when
 * entering any game tab, and shows the End-of-Session reflection modal when
 * leaving an active game arena.
 */
export function useStudioNavigation({
  activeTab,
  setActiveTab,
  data: { profileRef, matchesRef, dailyRef, storedGuestTrialsRef },
  session: {
    sessionAccumulatorRef,
    sessionElapsedSeconds,
    resetArenaSession,
    pendingLeaveTab,
    setPendingLeaveTab,
    setPendingSessionSummary,
  },
  achievementEvaluation,
  openRegistrationGate,
}: {
  activeTab: StudioTab;
  setActiveTab: (tab: StudioTab) => void;
  data: AppData;
  session: SessionTracking;
  achievementEvaluation: AchievementEvaluation;
  openRegistrationGate: (gameId?: PlayableGameId) => void;
}) {
  const [activeArithmeticGame, setActiveArithmeticGame] =
    useState<ArithmeticGameId>('addition-attack');
  const [tabAnnouncement, setTabAnnouncement] = useState('');
  const hasMountedTabRef = useRef(false);

  const activeTabA11y = useMemo(
    () => getStudioTabA11yMeta(activeTab, activeArithmeticGame),
    [activeTab, activeArithmeticGame]
  );

  // Announce active studio tab / game arena changes politely to screen readers
  useEffect(() => {
    if (!hasMountedTabRef.current) {
      hasMountedTabRef.current = true;
      return;
    }
    const timer = window.setTimeout(() => {
      setTabAnnouncement(activeTabA11y.announcement);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeTabA11y.announcement]);

  const isGameLockedNow = useCallback(
    (gameId: PlayableGameId) => {
      const signedIn =
        profileRef.current.sessionKind === 'authenticated' &&
        Boolean(profileRef.current.uid);
      const trials = computeEffectiveGuestTrials(
        storedGuestTrialsRef.current,
        matchesRef.current,
        dailyRef.current
      );
      return isGuestGameLocked({
        isSignedIn: signedIn,
        gameId,
        trialUsage: trials,
      });
    },
    [profileRef, matchesRef, dailyRef, storedGuestTrialsRef]
  );

  const requestNavigateTab = useCallback(
    (nextTab: StudioTab) => {
      if (nextTab === activeTab) return;

      const targetGameId = resolveGameIdForTab(nextTab, activeArithmeticGame);
      if (targetGameId && isGameLockedNow(targetGameId)) {
        openRegistrationGate(targetGameId);
        return;
      }

      const idleVisit =
        sessionAccumulatorRef.current.problemsAttempted === 0 &&
        sessionAccumulatorRef.current.matchesRecorded === 0;
      if (isActiveGameTab(activeTab) && !idleVisit) {
        const acc = sessionAccumulatorRef.current;
        const summary = buildEndOfSessionSummary({
          arenaTab: activeTab,
          arenaLabel: TAB_DEST_LABELS[activeTab],
          elapsedSeconds: sessionElapsedSeconds,
          problemsSolved: acc.problemsSolved,
          problemsAttempted: acc.problemsAttempted,
          matchesRecorded: acc.matchesRecorded,
          newlyEarnedSeals: acc.newlyEarnedSeals,
          evaluation: achievementEvaluation,
        });
        setPendingSessionSummary(summary);
        setPendingLeaveTab(nextTab);
        return;
      }

      if (isActiveGameTab(nextTab)) {
        resetArenaSession();
      }
      setActiveTab(nextTab);
    },
    [
      achievementEvaluation,
      activeArithmeticGame,
      activeTab,
      isGameLockedNow,
      openRegistrationGate,
      resetArenaSession,
      setActiveTab,
      sessionAccumulatorRef,
      sessionElapsedSeconds,
      setPendingLeaveTab,
      setPendingSessionSummary,
    ]
  );

  const handleConfirmLeaveArena = useCallback(() => {
    if (!pendingLeaveTab) return;
    const dest = pendingLeaveTab;
    setPendingLeaveTab(null);
    setPendingSessionSummary(null);
    resetArenaSession();
    setActiveTab(dest);
  }, [pendingLeaveTab, resetArenaSession, setActiveTab, setPendingLeaveTab, setPendingSessionSummary]);

  const handleStayInArena = useCallback(() => {
    setPendingLeaveTab(null);
    setPendingSessionSummary(null);
  }, [setPendingLeaveTab, setPendingSessionSummary]);

  const handleLaunchArithmetic = useCallback(
    (gameId: ArithmeticGameId) => {
      if (isGameLockedNow(gameId)) {
        openRegistrationGate(gameId);
        return;
      }
      setActiveArithmeticGame(gameId);
      resetArenaSession();
      setActiveTab('play-arithmetic');
    },
    [isGameLockedNow, openRegistrationGate, resetArenaSession, setActiveTab]
  );

  const handleLaunchAnyGame = useCallback(
    (gameId: PlayableGameId) => {
      if (isGameLockedNow(gameId)) {
        openRegistrationGate(gameId);
        return;
      }
      switch (gameId) {
        case 'addition-attack':
        case 'subtraction-sprint':
        case 'multiplication-mastery':
          handleLaunchArithmetic(gameId);
          break;
        case 'equation-foundry':
          requestNavigateTab('play-equation-foundry');
          break;
        case 'odds-urns':
          requestNavigateTab('play-odds-urns');
          break;
        case 'factor-grid':
          requestNavigateTab('play-factor-grid');
          break;
        case 'daily-challenge':
          requestNavigateTab('daily');
          break;
      }
    },
    [handleLaunchArithmetic, isGameLockedNow, openRegistrationGate, requestNavigateTab]
  );

  return {
    activeArithmeticGame,
    activeTabA11y,
    tabAnnouncement,
    requestNavigateTab,
    handleConfirmLeaveArena,
    handleStayInArena,
    handleLaunchArithmetic,
    handleLaunchAnyGame,
  };
}
