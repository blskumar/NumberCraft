'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import TopNav, { type StudioTab } from '@/components/TopNav';
import StudioHub from '@/components/StudioHub';
import FactorGridPrototype from '@/components/FactorGridPrototype';
import ArithmeticArena from '@/components/ArithmeticArena';
import EquationFoundryArena from '@/components/EquationFoundryArena';
import OddsUrnsArena from '@/components/OddsUrnsArena';
import DailyChallengeArena from '@/components/DailyChallengeArena';
import OnlineRoomsPreview from '@/components/OnlineRoomsPreview';
import MasteryNotebook from '@/components/MasteryNotebook';
import PerformanceDashboard from '@/components/PerformanceDashboard';
import GameRulesGuide from '@/components/GameRulesGuide';
import AccountModal from '@/components/AccountModal';
import MasteryProgressBar from '@/components/MasteryProgressBar';
import SessionElapsedTimer from '@/components/SessionElapsedTimer';
import ConfettiCelebration from '@/components/ConfettiCelebration';
import EndOfSessionModal from '@/components/EndOfSessionModal';
import {
  evaluateAchievements,
  type AchievementDefinition,
} from '@/lib/achievements';
import {
  buildDailyMatchRecord,
  getLocalDateKey,
} from '@/lib/daily-challenge';
import {
  DAILY_MILESTONE_MULTIPLIER,
  evaluateDailyMilestone,
  getDailyMilestoneForDate,
  isMatchForDailyMilestoneArena,
} from '@/lib/daily-milestone';
import {
  appendMatch,
  clearAllLocalProgress,
  DEFAULT_PROFILE,
  loadDailyCompletions,
  loadEarnedBadges,
  loadMatches,
  loadProfile,
  saveDailyCompletions,
  saveEarnedBadges,
  saveMatches,
  saveProfile,
  upsertDailyCompletion,
} from '@/lib/storage';
import {
  createSampleMatches,
  isSampleMatch,
} from '@/lib/notebook-analytics';
import {
  createSampleDashboardData,
  isSampleDailyCompletion,
} from '@/lib/performance-dashboard';
import {
  buildEndOfSessionSummary,
  isActiveGameTab,
  type ArenaSessionStats,
} from '@/lib/session-tracker';
import { playAchievementChime, playSoundPreviewChime } from '@/lib/sound';
import { getStudioTabA11yMeta } from '@/lib/studio-a11y';
import {
  applyThemeToDocument,
  loadThemePreference,
  saveThemePreference,
} from '@/lib/theme';
import type {
  AchievementId,
  AgeTier,
  ArithmeticGameId,
  DailyChallengeCompletion,
  EarnedBadgeRecord,
  MatchRecord,
  StudentProfile,
  ThemePreference,
} from '@/lib/types';

const TAB_DEST_LABELS: Record<StudioTab, string> = {
  studio: 'Games Studio',
  daily: 'Daily Challenge',
  dashboard: 'Performance Dashboard',
  'play-arithmetic': 'Core Arithmetic',
  'play-factor-grid': 'Factor Grid',
  'play-equation-foundry': 'Equation Foundry',
  'play-odds-urns': 'Odds & Urns',
  rooms: 'Online Rooms',
  notebook: 'Mastery Notebook',
  rules: 'Rules & Guide',
};

export default function NumbercraftApp() {
  const searchParams = useSearchParams();
  const autoStartParam = searchParams.get('autostart') === '1';

  const [activeTab, setActiveTab] = useState<StudioTab>(
    autoStartParam ? 'play-factor-grid' : 'studio'
  );
  const [activeArithmeticGame, setActiveArithmeticGame] =
    useState<ArithmeticGameId>('addition-attack');
  const [hydrated, setHydrated] = useState(false);
  const [profile, setProfile] = useState<StudentProfile>(DEFAULT_PROFILE);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadgeRecord[]>([]);
  const [dailyCompletions, setDailyCompletions] = useState<
    DailyChallengeCompletion[]
  >([]);
  const [accountOpen, setAccountOpen] = useState(false);
  const [recentlyUnlockedBadgeIds, setRecentlyUnlockedBadgeIds] = useState<
    AchievementId[]
  >([]);
  const [tabAnnouncement, setTabAnnouncement] = useState('');
  const [themePreference, setThemePreference] =
    useState<ThemePreference>('system');

  // Confetti celebration burst counter
  const [confettiTriggerKey, setConfettiTriggerKey] = useState(0);

  // Subtle persistent session timer + End-of-Session reflection modal state
  const [sessionElapsedSeconds, setSessionElapsedSeconds] = useState(0);
  const [pendingLeaveTab, setPendingLeaveTab] = useState<StudioTab | null>(null);
  const [pendingSessionSummary, setPendingSessionSummary] =
    useState<ArenaSessionStats | null>(null);

  const sessionAccumulatorRef = useRef({
    problemsSolved: 0,
    problemsAttempted: 0,
    matchesRecorded: 0,
    newlyEarnedSeals: [] as string[],
  });

  const earnedBadgesRef = useRef<EarnedBadgeRecord[]>(earnedBadges);
  const profileRef = useRef<StudentProfile>(profile);
  const matchesRef = useRef<MatchRecord[]>(matches);
  const dailyRef = useRef<DailyChallengeCompletion[]>(dailyCompletions);
  const hasMountedTabRef = useRef(false);

  const inActiveGameArena = isActiveGameTab(activeTab);

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

  // Persistent elapsed session clock while inside an active game arena
  useEffect(() => {
    if (!inActiveGameArena || pendingLeaveTab !== null) return;
    const id = window.setInterval(() => {
      setSessionElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [inActiveGameArena, pendingLeaveTab]);

  // Hydrate guest profile, match ledger, daily history, and latched Mastery Seals once on mount
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const loadedProfile = loadProfile();
      const loadedMatches = loadMatches();
      const loadedBadges = loadEarnedBadges();
      const loadedDaily = loadDailyCompletions();
      const loadedTheme =
        loadedProfile.themePreference ?? loadThemePreference();
      applyThemeToDocument(loadedTheme);
      setThemePreference(loadedTheme);

      const reconciled = evaluateAchievements(
        loadedMatches,
        loadedBadges,
        loadedDaily
      );
      let nextProfile = loadedProfile;
      if (reconciled.newlyUnlocked.length > 0) {
        saveEarnedBadges(reconciled.earnedRecords);
        if (!loadedProfile.featuredBadgeId) {
          nextProfile = {
            ...loadedProfile,
            featuredBadgeId: reconciled.newlyUnlocked[0].id,
          };
          saveProfile(nextProfile);
        }
      }

      profileRef.current = nextProfile;
      earnedBadgesRef.current = reconciled.earnedRecords;
      matchesRef.current = loadedMatches;
      dailyRef.current = loadedDaily;
      setProfile(nextProfile);
      setMatches(loadedMatches);
      setEarnedBadges(reconciled.earnedRecords);
      setDailyCompletions(loadedDaily);
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const achievementEvaluation = useMemo(
    () => evaluateAchievements(matches, earnedBadges, dailyCompletions),
    [matches, earnedBadges, dailyCompletions]
  );

  const resetArenaSession = useCallback(() => {
    setSessionElapsedSeconds(0);
    sessionAccumulatorRef.current = {
      problemsSolved: 0,
      problemsAttempted: 0,
      matchesRecorded: 0,
      newlyEarnedSeals: [],
    };
  }, []);

  /**
   * Navigates between studio tabs. When leaving an active game arena, opens the
   * End-of-Session reflection modal summarizing solved problems, accuracy, and
   * progress toward the next Mastery Seal.
   */
  const requestNavigateTab = useCallback(
    (nextTab: StudioTab) => {
      if (nextTab === activeTab) return;

      if (isActiveGameTab(activeTab)) {
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
      activeTab,
      resetArenaSession,
      sessionElapsedSeconds,
    ]
  );

  const handleConfirmLeaveArena = useCallback(() => {
    if (!pendingLeaveTab) return;
    const dest = pendingLeaveTab;
    setPendingLeaveTab(null);
    setPendingSessionSummary(null);
    resetArenaSession();
    setActiveTab(dest);
  }, [pendingLeaveTab, resetArenaSession]);

  const handleStayInArena = useCallback(() => {
    setPendingLeaveTab(null);
    setPendingSessionSummary(null);
  }, []);

  const handleUpdateProfile = useCallback((next: StudentProfile) => {
    profileRef.current = next;
    setProfile(next);
    saveProfile(next);
  }, []);

  const handleClearLocalProgress = useCallback(() => {
    clearAllLocalProgress();
    earnedBadgesRef.current = [];
    matchesRef.current = [];
    dailyRef.current = [];
    setMatches([]);
    setEarnedBadges([]);
    setDailyCompletions([]);
  }, []);

  const handleSelectFeaturedBadge = useCallback((id: AchievementId | null) => {
    setProfile((prev) => {
      const next: StudentProfile = { ...prev, featuredBadgeId: id };
      profileRef.current = next;
      saveProfile(next);
      return next;
    });
  }, []);

  const handleChangeTier = useCallback((tier: AgeTier) => {
    setProfile((prev) => {
      const next = { ...prev, ageTier: tier };
      profileRef.current = next;
      saveProfile(next);
      return next;
    });
  }, []);

  const handleChangeTheme = useCallback((nextTheme: ThemePreference) => {
    setThemePreference(nextTheme);
    saveThemePreference(nextTheme);
    applyThemeToDocument(nextTheme);
    setProfile((prev) => {
      const next: StudentProfile = { ...prev, themePreference: nextTheme };
      profileRef.current = next;
      saveProfile(next);
      return next;
    });
  }, []);

  // Follow OS prefers-color-scheme live when user selected System mode
  useEffect(() => {
    applyThemeToDocument(themePreference);
    if (themePreference !== 'system' || typeof window === 'undefined' || !window.matchMedia) {
      return;
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyThemeToDocument('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [themePreference]);

  const handleToggleSound = useCallback(() => {
    setProfile((prev) => {
      const next = { ...prev, soundEnabled: !prev.soundEnabled };
      profileRef.current = next;
      saveProfile(next);
      if (next.soundEnabled) {
        playSoundPreviewChime(true);
      }
      return next;
    });
  }, []);

  const handleLaunchArithmetic = useCallback(
    (gameId: ArithmeticGameId) => {
      setActiveArithmeticGame(gameId);
      resetArenaSession();
      setActiveTab('play-arithmetic');
    },
    [resetArenaSession]
  );

  const handleRecordMatch = useCallback(
    (record: MatchRecord): AchievementDefinition[] => {
      const todayKey = getLocalDateKey();
      const todayMilestone = getDailyMilestoneForDate(todayKey);
      const wasCompletedBefore = evaluateDailyMilestone(
        matchesRef.current,
        todayKey
      ).completedToday;

      const qualifiesForDailyMilestone = isMatchForDailyMilestoneArena(
        record,
        todayMilestone.arenaId
      );
      const enrichedRecord: MatchRecord = qualifiesForDailyMilestone
        ? {
            ...record,
            dailyMilestoneMultiplier: DAILY_MILESTONE_MULTIPLIER,
          }
        : record;

      const updatedMatches = appendMatch(enrichedRecord);
      matchesRef.current = updatedMatches;
      setMatches(updatedMatches);

      if (qualifiesForDailyMilestone && !wasCompletedBefore) {
        setConfettiTriggerKey((k) => k + 1);
        playAchievementChime(profileRef.current.soundEnabled);
      }

      // Accumulate session metrics for End-of-Session reflection modal
      const acc = sessionAccumulatorRef.current;
      acc.matchesRecorded += 1;
      if (record.arithmeticMeta) {
        acc.problemsSolved += record.arithmeticMeta.solved;
        acc.problemsAttempted += record.arithmeticMeta.attempted;
      } else if (record.gameTitle === 'Equation Foundry' || record.gameTitle === 'Odds & Urns') {
        acc.problemsSolved += 5;
        acc.problemsAttempted += 5;
      } else {
        acc.problemsSolved += record.result === 'win' ? 1 : 0;
        acc.problemsAttempted += 1;
      }

      const evaluation = evaluateAchievements(
        updatedMatches,
        earnedBadgesRef.current,
        dailyRef.current
      );

      if (evaluation.newlyUnlocked.length > 0) {
        const newIds = evaluation.newlyUnlocked.map((b) => b.id);
        const newTitles = evaluation.newlyUnlocked.map((b) => b.title);
        acc.newlyEarnedSeals = Array.from(
          new Set([...acc.newlyEarnedSeals, ...newTitles])
        );
        earnedBadgesRef.current = evaluation.earnedRecords;
        setEarnedBadges(evaluation.earnedRecords);
        setRecentlyUnlockedBadgeIds((prev) =>
          Array.from(new Set([...prev, ...newIds]))
        );
        saveEarnedBadges(evaluation.earnedRecords);

        // Trigger canvas confetti celebration + gentle achievement chime
        setConfettiTriggerKey((k) => k + 1);
        playAchievementChime(profileRef.current.soundEnabled);

        if (!profileRef.current.featuredBadgeId) {
          const nextProfile: StudentProfile = {
            ...profileRef.current,
            featuredBadgeId: evaluation.newlyUnlocked[0].id,
          };
          profileRef.current = nextProfile;
          setProfile(nextProfile);
          saveProfile(nextProfile);
        }
      }

      return evaluation.newlyUnlocked;
    },
    []
  );

  const handleCompleteDaily = useCallback(
    (completion: DailyChallengeCompletion): AchievementDefinition[] => {
      const updatedDaily = upsertDailyCompletion(completion);
      dailyRef.current = updatedDaily;
      setDailyCompletions(updatedDaily);

      const dailyMatch = buildDailyMatchRecord(completion);
      const updatedMatches = appendMatch(dailyMatch);
      matchesRef.current = updatedMatches;
      setMatches(updatedMatches);

      const acc = sessionAccumulatorRef.current;
      acc.matchesRecorded += 1;
      acc.problemsSolved += completion.solved ? 3 : 0;
      acc.problemsAttempted += 3 + completion.mistakes;

      const evaluation = evaluateAchievements(
        updatedMatches,
        earnedBadgesRef.current,
        updatedDaily
      );

      if (evaluation.newlyUnlocked.length > 0) {
        const newIds = evaluation.newlyUnlocked.map((b) => b.id);
        const newTitles = evaluation.newlyUnlocked.map((b) => b.title);
        acc.newlyEarnedSeals = Array.from(
          new Set([...acc.newlyEarnedSeals, ...newTitles])
        );
        earnedBadgesRef.current = evaluation.earnedRecords;
        setEarnedBadges(evaluation.earnedRecords);
        setRecentlyUnlockedBadgeIds((prev) =>
          Array.from(new Set([...prev, ...newIds]))
        );
        saveEarnedBadges(evaluation.earnedRecords);

        if (!profileRef.current.featuredBadgeId) {
          const nextProfile: StudentProfile = {
            ...profileRef.current,
            featuredBadgeId: evaluation.newlyUnlocked[0].id,
          };
          profileRef.current = nextProfile;
          setProfile(nextProfile);
          saveProfile(nextProfile);
        }
      }

      // Trigger celebratory canvas confetti + gentle completion chime on Daily solve or new badge
      if (completion.solved || evaluation.newlyUnlocked.length > 0) {
        setConfettiTriggerKey((k) => k + 1);
        playAchievementChime(profileRef.current.soundEnabled);
      }

      return evaluation.newlyUnlocked;
    },
    []
  );

  const handleLoadSampleMatches = useCallback(() => {
    setMatches((prev) => {
      const realOnly = prev.filter((m) => !isSampleMatch(m));
      const merged = [...realOnly, ...createSampleMatches()].sort(
        (a, b) =>
          new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime()
      );
      matchesRef.current = merged;
      saveMatches(merged);
      return merged;
    });
  }, []);

  const handleClearSampleMatches = useCallback(() => {
    setMatches((prev) => {
      const realOnly = prev.filter((m) => !isSampleMatch(m));
      matchesRef.current = realOnly;
      saveMatches(realOnly);
      return realOnly;
    });
    setDailyCompletions((prev) => {
      const realDaily = prev.filter((c) => !isSampleDailyCompletion(c));
      dailyRef.current = realDaily;
      saveDailyCompletions(realDaily);
      return realDaily;
    });
  }, []);

  const handleLoadSampleDashboard = useCallback(() => {
    const { sampleMatches, sampleDaily } = createSampleDashboardData();
    setMatches((prev) => {
      const realOnly = prev.filter((m) => !isSampleMatch(m));
      const merged = [
        ...realOnly,
        ...createSampleMatches(),
        ...sampleMatches,
      ].sort(
        (a, b) =>
          new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime()
      );
      matchesRef.current = merged;
      saveMatches(merged);
      return merged;
    });
    setDailyCompletions((prev) => {
      const realOnly = prev.filter((c) => !isSampleDailyCompletion(c));
      const existingDates = new Set(realOnly.map((c) => c.dateKey));
      const mergedDaily = [
        ...realOnly,
        ...sampleDaily.filter((c) => !existingDates.has(c.dateKey)),
      ].sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1));
      dailyRef.current = mergedDaily;
      saveDailyCompletions(mergedDaily);
      return mergedDaily;
    });
  }, []);

  return (
    <div className="paper-grid flex min-h-screen flex-col">
      <a
        href="#studio-active-container"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:border focus:border-[#1D4ED8] focus:bg-white focus:px-3.5 focus:py-2 focus:text-xs focus:font-semibold focus:text-[#1D4ED8] focus:shadow-md"
      >
        Skip to {activeTabA11y.regionLabel}
      </a>

      {/* Global polite ARIA live region for screen-reader tab & game switch feedback */}
      <div
        id="studio-tab-announcer"
        data-testid="studio-tab-announcer"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {tabAnnouncement}
      </div>

      {/* Canvas-based celebratory confetti overlay on badge unlock & daily solve */}
      <ConfettiCelebration triggerKey={confettiTriggerKey} />

      <MasteryProgressBar
        earnedCount={achievementEvaluation.earnedCount}
        totalCount={achievementEvaluation.totalCount}
        onOpenNotebook={() => requestNavigateTab('notebook')}
      />

      <TopNav
        activeTab={activeTab}
        onSelectTab={requestNavigateTab}
        profile={profile}
        earnedSealCount={achievementEvaluation.earnedCount}
        themePreference={themePreference}
        onChangeTheme={handleChangeTheme}
        onOpenAccount={() => setAccountOpen(true)}
      />

      {/* Subtle persistent top-right session timer while inside active game arenas */}
      {inActiveGameArena && (
        <SessionElapsedTimer
          elapsedSeconds={sessionElapsedSeconds}
          arenaName={TAB_DEST_LABELS[activeTab]}
        />
      )}

      <div
        id="studio-active-container"
        data-testid="studio-active-region"
        data-active-tab={activeTab}
        role="region"
        aria-label={activeTabA11y.regionLabel}
        aria-describedby="studio-tab-announcer"
        aria-busy={!hydrated}
        tabIndex={-1}
        className="flex-1 outline-none"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            id={activeTabA11y.containerId}
            role="region"
            aria-label={activeTabA11y.regionLabel}
            aria-roledescription={
              activeTabA11y.isGameArena ? 'interactive math game' : undefined
            }
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            {activeTab === 'studio' && (
              <StudioHub
                ageTier={profile.ageTier}
                playerName={profile.displayName}
                onChangeTier={handleChangeTier}
                onLaunchFactorGrid={() => requestNavigateTab('play-factor-grid')}
                onLaunchArithmetic={handleLaunchArithmetic}
                onLaunchEquationFoundry={() =>
                  requestNavigateTab('play-equation-foundry')
                }
                onLaunchOddsUrns={() => requestNavigateTab('play-odds-urns')}
                onOpenDaily={() => requestNavigateTab('daily')}
                onOpenRooms={() => requestNavigateTab('rooms')}
                matches={matches}
                matchesCount={matches.length}
                dailyCompletions={dailyCompletions}
              />
            )}

            {activeTab === 'daily' && (
              <div
                data-testid="game-container-daily"
                role="region"
                aria-label="Daily Math Challenge Interactive Game"
              >
                <span className="sr-only" aria-live="polite">
                  Daily Math Challenge Arena active.
                </span>
                <DailyChallengeArena
                  ageTier={profile.ageTier}
                  onChangeTier={handleChangeTier}
                  playerName={profile.displayName}
                  soundEnabled={profile.soundEnabled}
                  onToggleSound={handleToggleSound}
                  dailyCompletions={dailyCompletions}
                  achievementEvaluation={achievementEvaluation}
                  onCompleteDaily={handleCompleteDaily}
                  onBackToStudio={() => requestNavigateTab('studio')}
                  onOpenNotebook={() => requestNavigateTab('notebook')}
                />
              </div>
            )}

            {activeTab === 'dashboard' && (
              <PerformanceDashboard
                profile={profile}
                matches={matches}
                dailyCompletions={dailyCompletions}
                onLaunchArithmetic={handleLaunchArithmetic}
                onOpenDaily={() => requestNavigateTab('daily')}
                onLoadSampleDashboard={handleLoadSampleDashboard}
                onClearSampleDashboard={handleClearSampleMatches}
              />
            )}

            {activeTab === 'play-arithmetic' && (
              <div
                data-testid="game-container-arithmetic"
                role="region"
                aria-label={activeTabA11y.regionLabel}
              >
                <span className="sr-only" aria-live="polite">
                  {activeTabA11y.regionLabel} active.
                </span>
                <ArithmeticArena
                  key={activeArithmeticGame}
                  initialGameId={activeArithmeticGame}
                  ageTier={profile.ageTier}
                  onChangeTier={handleChangeTier}
                  playerName={profile.displayName}
                  soundEnabled={profile.soundEnabled}
                  onToggleSound={handleToggleSound}
                  onBackToStudio={() => requestNavigateTab('studio')}
                  onOpenNotebook={() => requestNavigateTab('notebook')}
                  onRecordMatch={handleRecordMatch}
                  matches={matches}
                />
              </div>
            )}

            {activeTab === 'play-factor-grid' &&
              (!autoStartParam || hydrated) && (
                <div
                  data-testid="game-container-factor-grid"
                  role="region"
                  aria-label="Factor Grid Strategy Interactive Game"
                >
                  <span className="sr-only" aria-live="polite">
                    Factor Grid Strategy Game Arena active.
                  </span>
                  <FactorGridPrototype
                    ageTier={profile.ageTier}
                    onChangeTier={handleChangeTier}
                    playerName={profile.displayName}
                    soundEnabled={profile.soundEnabled}
                    onToggleSound={handleToggleSound}
                    onBackToStudio={() => requestNavigateTab('studio')}
                    onOpenRooms={() => requestNavigateTab('rooms')}
                    onOpenNotebook={() => requestNavigateTab('notebook')}
                    onRecordMatch={handleRecordMatch}
                    autoStart={autoStartParam}
                  />
                </div>
              )}

            {activeTab === 'play-equation-foundry' && (
              <div
                data-testid="game-container-equation-foundry"
                role="region"
                aria-label="Equation Foundry Expression Interactive Game"
              >
                <span className="sr-only" aria-live="polite">
                  Equation Foundry Expression Game Arena active.
                </span>
                <EquationFoundryArena
                  ageTier={profile.ageTier}
                  onChangeTier={handleChangeTier}
                  playerName={profile.displayName}
                  soundEnabled={profile.soundEnabled}
                  onToggleSound={handleToggleSound}
                  onBackToStudio={() => requestNavigateTab('studio')}
                  onOpenNotebook={() => requestNavigateTab('notebook')}
                  onRecordMatch={handleRecordMatch}
                />
              </div>
            )}

            {activeTab === 'play-odds-urns' && (
              <div
                data-testid="game-container-odds-urns"
                role="region"
                aria-label="Odds and Urns Modular Probability Interactive Game"
              >
                <span className="sr-only" aria-live="polite">
                  Odds and Urns Probability Game Arena active.
                </span>
                <OddsUrnsArena
                  ageTier={profile.ageTier}
                  onChangeTier={handleChangeTier}
                  playerName={profile.displayName}
                  soundEnabled={profile.soundEnabled}
                  onToggleSound={handleToggleSound}
                  onBackToStudio={() => requestNavigateTab('studio')}
                  onOpenNotebook={() => requestNavigateTab('notebook')}
                  onRecordMatch={handleRecordMatch}
                />
              </div>
            )}

            {activeTab === 'rooms' && (
              <OnlineRoomsPreview
                ageTier={profile.ageTier}
                profile={profile}
                onOpenAccount={() => setAccountOpen(true)}
                onLaunchLocalFactorGrid={() =>
                  requestNavigateTab('play-factor-grid')
                }
              />
            )}

            {activeTab === 'notebook' && (
              <MasteryNotebook
                profile={profile}
                matches={matches}
                achievementEvaluation={achievementEvaluation}
                onSelectFeaturedBadge={handleSelectFeaturedBadge}
                onPlayFactorGrid={() => requestNavigateTab('play-factor-grid')}
                onLoadSampleMatches={handleLoadSampleMatches}
                onClearSampleMatches={handleClearSampleMatches}
              />
            )}

            {activeTab === 'rules' && (
              <GameRulesGuide
                onLaunchArithmetic={handleLaunchArithmetic}
                onLaunchEquationFoundry={() =>
                  requestNavigateTab('play-equation-foundry')
                }
                onLaunchOddsUrns={() => requestNavigateTab('play-odds-urns')}
                onLaunchFactorGrid={() => requestNavigateTab('play-factor-grid')}
                onOpenDaily={() => requestNavigateTab('daily')}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <footer className="mt-12 border-t border-[#E5E0D5] bg-[#FAF8F4] py-5">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3 px-4 text-xs text-[#5A6572] sm:px-6 lg:px-8">
          <span>Numbercraft · Mathematics &amp; Probability Game Studio</span>
          <span>
            Core Arithmetic · Equation Foundry · Odds &amp; Urns · Factor Grid ·
            Daily Challenge
          </span>
        </div>
      </footer>

      <EndOfSessionModal
        open={pendingLeaveTab !== null && pendingSessionSummary !== null}
        summary={pendingSessionSummary}
        destinationLabel={
          pendingLeaveTab ? TAB_DEST_LABELS[pendingLeaveTab] : 'Games Studio'
        }
        onConfirmLeave={handleConfirmLeaveArena}
        onStayInArena={handleStayInArena}
      />

      <AccountModal
        open={accountOpen}
        onClose={() => {
          setAccountOpen(false);
          setRecentlyUnlockedBadgeIds([]);
        }}
        profile={profile}
        matchCount={matches.length}
        achievementEvaluation={achievementEvaluation}
        recentlyUnlockedBadgeIds={recentlyUnlockedBadgeIds}
        themePreference={themePreference}
        onChangeTheme={handleChangeTheme}
        onUpdateProfile={handleUpdateProfile}
        onClearLocalProgress={handleClearLocalProgress}
        onOpenNotebook={() => requestNavigateTab('notebook')}
      />
    </div>
  );
}
