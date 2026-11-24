'use client';

import { useEffect, useMemo, useState } from 'react';
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
import GameArenaShell from '@/components/app/GameArenaShell';
import { TAB_DEST_LABELS, resolveGameIdForTab } from '@/components/app/appHelpers';
import { useAccountModal } from '@/components/app/useAccountModal';
import { useAppData } from '@/components/app/useAppData';
import { useAuthWatch } from '@/components/app/useAuthWatch';
import { useHydration } from '@/components/app/useHydration';
import { useMatchRecording } from '@/components/app/useMatchRecording';
import { useProfileActions } from '@/components/app/useProfileActions';
import { useSampleData } from '@/components/app/useSampleData';
import { useSessionTracking } from '@/components/app/useSessionTracking';
import { useStudioNavigation } from '@/components/app/useStudioNavigation';
import {
  evaluateAchievements,
  getRecentEarnedAchievements,
} from '@/lib/achievements';
import { beginCloudRound } from '@/lib/firebase';
import {
  computeEffectiveGuestTrials,
  isGuestGameLocked,
  PLAYABLE_GAME_IDS,
  type PlayableGameId,
} from '@/lib/guest-trial';

export default function NumbercraftApp() {
  const searchParams = useSearchParams();
  const autoStartParam = searchParams.get('autostart') === '1';

  const [activeTab, setActiveTab] = useState<StudioTab>(
    autoStartParam ? 'play-factor-grid' : 'studio'
  );

  const data = useAppData();
  const { profile, matches, earnedBadges, dailyCompletions, storedGuestTrials } = data;

  const account = useAccountModal();
  const { openAccountModal, openRegistrationGate } = account;
  const session = useSessionTracking(activeTab);
  const { inActiveGameArena, sessionElapsedSeconds, pendingLeaveTab, pendingSessionSummary } = session;

  const profileActions = useProfileActions(data);
  const { themePreference, handleChangeTheme, handleChangeTier, handleToggleSound } = profileActions;
  const hydrated = useHydration(data, profileActions.setThemePreference);
  useAuthWatch(data, hydrated);

  const isSignedIn =
    profile.sessionKind === 'authenticated' && Boolean(profile.uid);

  const effectiveGuestTrials = useMemo(
    () =>
      computeEffectiveGuestTrials(
        storedGuestTrials,
        matches,
        dailyCompletions
      ),
    [storedGuestTrials, matches, dailyCompletions]
  );

  const guestLockedGames = useMemo(() => {
    const locked: Record<PlayableGameId, boolean> = {
      'addition-attack': false,
      'subtraction-sprint': false,
      'multiplication-mastery': false,
      'equation-foundry': false,
      'odds-urns': false,
      'factor-grid': false,
      'daily-challenge': false,
    };
    for (const id of PLAYABLE_GAME_IDS) {
      locked[id] = isGuestGameLocked({
        isSignedIn,
        gameId: id,
        trialUsage: effectiveGuestTrials,
      });
    }
    return locked;
  }, [effectiveGuestTrials, isSignedIn]);

  const achievementEvaluation = useMemo(
    () => evaluateAchievements(matches, earnedBadges, dailyCompletions),
    [matches, earnedBadges, dailyCompletions]
  );

  const earnedSealHistory = useMemo(
    () =>
      getRecentEarnedAchievements(
        achievementEvaluation,
        achievementEvaluation.totalCount
      ),
    [achievementEvaluation]
  );

  const nav = useStudioNavigation({
    activeTab,
    setActiveTab,
    data,
    session,
    achievementEvaluation,
    openRegistrationGate,
  });
  const { activeArithmeticGame, activeTabA11y, requestNavigateTab, handleLaunchArithmetic } = nav;

  const recording = useMatchRecording(data, session.sessionAccumulatorRef);
  const sampleData = useSampleData(data);

  // Server-timed round token: opened when a signed-in player enters a game
  // screen (and re-opened after each submit by saveCloudGameScore). Guests and
  // non-game tabs never touch Firebase.
  const signedInUid =
    profile.sessionKind === 'authenticated' ? profile.uid : undefined;
  useEffect(() => {
    if (!signedInUid) return;
    const gameId = resolveGameIdForTab(activeTab, activeArithmeticGame);
    if (gameId) void beginCloudRound(gameId, data.profileRef.current.ageTier);
  }, [signedInUid, activeTab, activeArithmeticGame, data.profileRef]);

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
        {nav.tabAnnouncement}
      </div>

      {/* Canvas-based celebratory confetti overlay on badge unlock & daily solve */}
      <ConfettiCelebration triggerKey={recording.confettiTriggerKey} />

      <div role="region" aria-label="Mastery progress">
      <MasteryProgressBar
        earnedCount={achievementEvaluation.earnedCount}
        totalCount={achievementEvaluation.totalCount}
        earnedHistory={earnedSealHistory}
        onOpenNotebook={() => requestNavigateTab('notebook')}
        unlockEventKey={recording.masteryUnlockEventKey}
        latestUnlockedTitle={recording.latestUnlockedSealTitle}
        isHydrated={hydrated}
      />
      </div>

      <TopNav
        activeTab={activeTab}
        onSelectTab={requestNavigateTab}
        profile={profile}
        earnedSealCount={achievementEvaluation.earnedCount}
        themePreference={themePreference}
        onChangeTheme={handleChangeTheme}
        onOpenAccount={() => openAccountModal({ section: 'profile' })}
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
        aria-describedby="studio-tab-announcer"
        aria-busy={!hydrated}
        tabIndex={-1}
        className="flex-1 outline-none"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            id={activeTabA11y.containerId}
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
                isSignedIn={isSignedIn}
                guestLockedGames={guestLockedGames}
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
                dailyProblemGoal={profile.dailyProblemGoal}
              />
            )}

            {activeTab === 'daily' && (
              <GameArenaShell
                testId="game-container-daily"
                label="Daily Math Challenge Interactive Game"
                announce="Daily Math Challenge Arena active."
              >
                <DailyChallengeArena
                  ageTier={profile.ageTier}
                  onChangeTier={handleChangeTier}
                  playerName={profile.displayName}
                  soundEnabled={profile.soundEnabled}
                  onToggleSound={handleToggleSound}
                  dailyCompletions={dailyCompletions}
                  achievementEvaluation={achievementEvaluation}
                  onCompleteDaily={recording.handleCompleteDaily}
                  onBackToStudio={() => requestNavigateTab('studio')}
                  onOpenNotebook={() => requestNavigateTab('notebook')}
                />
              </GameArenaShell>
            )}

            {activeTab === 'dashboard' && (
              <PerformanceDashboard
                profile={profile}
                matches={matches}
                dailyCompletions={dailyCompletions}
                achievementEvaluation={achievementEvaluation}
                onChangeDailyGoal={profileActions.handleChangeDailyGoal}
                onLaunchArithmetic={handleLaunchArithmetic}
                onLaunchGame={nav.handleLaunchAnyGame}
                onOpenDaily={() => requestNavigateTab('daily')}
                onOpenNotebook={() => requestNavigateTab('notebook')}
                onOpenRegister={() => openRegistrationGate()}
                onLoadSampleDashboard={sampleData.handleLoadSampleDashboard}
                onClearSampleDashboard={sampleData.handleClearSampleMatches}
              />
            )}

            {activeTab === 'play-arithmetic' && (
              <GameArenaShell
                testId="game-container-arithmetic"
                label={activeTabA11y.regionLabel}
                announce={`${activeTabA11y.regionLabel} active.`}
              >
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
                  onRecordMatch={recording.handleRecordMatch}
                  matches={matches}
                  isGameLockedForGuest={(gid) => guestLockedGames[gid]}
                  onRequireRegistration={(gid) => openRegistrationGate(gid)}
                />
              </GameArenaShell>
            )}

            {activeTab === 'play-factor-grid' &&
              (!autoStartParam || hydrated) && (
                <GameArenaShell
                  testId="game-container-factor-grid"
                  label="Factor Grid Strategy Interactive Game"
                  announce="Factor Grid Strategy Game Arena active."
                >
                  <FactorGridPrototype
                    ageTier={profile.ageTier}
                    onChangeTier={handleChangeTier}
                    playerName={profile.displayName}
                    soundEnabled={profile.soundEnabled}
                    onToggleSound={handleToggleSound}
                    onBackToStudio={() => requestNavigateTab('studio')}
                    onOpenRooms={() => requestNavigateTab('rooms')}
                    onOpenNotebook={() => requestNavigateTab('notebook')}
                    onRecordMatch={recording.handleRecordMatch}
                    autoStart={autoStartParam}
                    guestTrialLocked={guestLockedGames['factor-grid']}
                    onRequireRegistration={() =>
                      openRegistrationGate('factor-grid')
                    }
                  />
                </GameArenaShell>
              )}

            {activeTab === 'play-equation-foundry' && (
              <GameArenaShell
                testId="game-container-equation-foundry"
                label="Equation Foundry Expression Interactive Game"
                announce="Equation Foundry Expression Game Arena active."
              >
                <EquationFoundryArena
                  ageTier={profile.ageTier}
                  onChangeTier={handleChangeTier}
                  playerName={profile.displayName}
                  soundEnabled={profile.soundEnabled}
                  onToggleSound={handleToggleSound}
                  onBackToStudio={() => requestNavigateTab('studio')}
                  onOpenNotebook={() => requestNavigateTab('notebook')}
                  onRecordMatch={recording.handleRecordMatch}
                  guestTrialLocked={guestLockedGames['equation-foundry']}
                  onRequireRegistration={() =>
                    openRegistrationGate('equation-foundry')
                  }
                />
              </GameArenaShell>
            )}

            {activeTab === 'play-odds-urns' && (
              <GameArenaShell
                testId="game-container-odds-urns"
                label="Odds and Urns Modular Probability Interactive Game"
                announce="Odds and Urns Probability Game Arena active."
              >
                <OddsUrnsArena
                  ageTier={profile.ageTier}
                  onChangeTier={handleChangeTier}
                  playerName={profile.displayName}
                  soundEnabled={profile.soundEnabled}
                  onToggleSound={handleToggleSound}
                  onBackToStudio={() => requestNavigateTab('studio')}
                  onOpenNotebook={() => requestNavigateTab('notebook')}
                  onRecordMatch={recording.handleRecordMatch}
                  guestTrialLocked={guestLockedGames['odds-urns']}
                  onRequireRegistration={() =>
                    openRegistrationGate('odds-urns')
                  }
                />
              </GameArenaShell>
            )}

            {activeTab === 'rooms' && (
              <OnlineRoomsPreview
                ageTier={profile.ageTier}
                profile={profile}
                onOpenAccount={() =>
                  openAccountModal({ section: 'auth', authMode: 'signup' })
                }
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
                onSelectFeaturedBadge={profileActions.handleSelectFeaturedBadge}
                onPlayFactorGrid={() => requestNavigateTab('play-factor-grid')}
                onLoadSampleMatches={sampleData.handleLoadSampleMatches}
                onClearSampleMatches={sampleData.handleClearSampleMatches}
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
        onConfirmLeave={nav.handleConfirmLeaveArena}
        onStayInArena={nav.handleStayInArena}
      />

      <AccountModal
        open={account.accountOpen}
        onClose={() => {
          account.closeAccountModal();
          recording.setRecentlyUnlockedBadgeIds([]);
        }}
        initialSection={account.accountInitialSection}
        initialAuthMode={account.accountInitialAuthMode}
        registrationGateGameTitle={account.registrationGateGameTitle}
        profile={profile}
        matchCount={matches.length}
        achievementEvaluation={achievementEvaluation}
        recentlyUnlockedBadgeIds={recording.recentlyUnlockedBadgeIds}
        themePreference={themePreference}
        onChangeTheme={handleChangeTheme}
        onUpdateProfile={profileActions.handleUpdateProfile}
        onClearLocalProgress={sampleData.handleClearLocalProgress}
        onOpenNotebook={() => requestNavigateTab('notebook')}
      />
    </div>
  );
}
