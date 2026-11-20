'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  ArrowRight,
  Calculator,
  Calendar,
  Check,
  Clock,
  Dices,
  Flame,
  Grid3X3,
  Layers,
  Moon,
  Sun,
  Sunrise,
  Sunset,
  Users,
  Zap,
} from 'lucide-react';
import studioHeroImg from '@/src/assets/images/studio_hero_desk_1795053506873.jpg';
import factorGridBannerImg from '@/src/assets/images/factor_grid_banner_1795053505503.jpg';
import DailyMathQuoteCard from '@/components/DailyMathQuoteCard';
import DailyGoalRing from '@/components/DailyGoalRing';
import DailyMilestoneCard from '@/components/DailyMilestoneCard';
import Tooltip from '@/components/Tooltip';
import {
  ARITHMETIC_GAME_ORDER,
  ARITHMETIC_GAMES,
} from '@/lib/arithmetic-engine';
import {
  computeDailyStreakStats,
  formatCountdownClock,
  generateDailyPuzzle,
  getLocalDateKey,
  getSecondsUntilNextDaily,
} from '@/lib/daily-challenge';
import { computeDailyGoalProgress } from '@/lib/daily-goal';
import {
  evaluateDailyMilestone,
  type DailyMilestoneArenaId,
} from '@/lib/daily-milestone';
import { TIER_SPECS } from '@/lib/factor-grid-engine';
import { getStudioGreeting } from '@/lib/greeting';
import type {
  AgeTier,
  ArithmeticGameId,
  DailyChallengeCompletion,
  MatchRecord,
} from '@/lib/types';

interface StudioHubProps {
  ageTier: AgeTier;
  playerName?: string;
  onChangeTier: (tier: AgeTier) => void;
  onLaunchFactorGrid: () => void;
  onLaunchArithmetic: (gameId: ArithmeticGameId) => void;
  onLaunchEquationFoundry: () => void;
  onLaunchOddsUrns: () => void;
  onOpenDaily: () => void;
  onOpenRooms: () => void;
  matches: MatchRecord[];
  matchesCount: number;
  dailyCompletions: DailyChallengeCompletion[];
}

const TIER_ORDER: AgeTier[] = ['explorers', 'challengers', 'strategists'];

const MARBLE_SPECS = [
  { bg: 'radial-gradient(circle at 32% 28%, #60A5FA, #1D4ED8 60%, #1E3A8A)' },
  { bg: 'radial-gradient(circle at 32% 28%, #60A5FA, #1D4ED8 60%, #1E3A8A)' },
  { bg: 'radial-gradient(circle at 32% 28%, #34D399, #047857 60%, #064E3B)' },
  { bg: 'radial-gradient(circle at 32% 28%, #60A5FA, #1D4ED8 60%, #1E3A8A)' },
  { bg: 'radial-gradient(circle at 32% 28%, #FB7185, #BE123C 60%, #881337)' },
  { bg: 'radial-gradient(circle at 32% 28%, #34D399, #047857 60%, #064E3B)' },
  { bg: 'radial-gradient(circle at 32% 28%, #60A5FA, #1D4ED8 60%, #1E3A8A)' },
  { bg: 'radial-gradient(circle at 32% 28%, #34D399, #047857 60%, #064E3B)' },
  { bg: 'radial-gradient(circle at 32% 28%, #FB7185, #BE123C 60%, #881337)' },
  { bg: 'radial-gradient(circle at 32% 28%, #60A5FA, #1D4ED8 60%, #1E3A8A)' },
];

export default function StudioHub({
  ageTier,
  playerName,
  onChangeTier,
  onLaunchFactorGrid,
  onLaunchArithmetic,
  onLaunchEquationFoundry,
  onLaunchOddsUrns,
  onOpenDaily,
  onOpenRooms,
  matches,
  matchesCount,
  dailyCompletions,
}: StudioHubProps) {
  const activeSpec = TIER_SPECS[ageTier];
  const todayKey = useMemo(() => getLocalDateKey(), []);
  const todayPuzzle = useMemo(
    () => generateDailyPuzzle(todayKey, ageTier),
    [todayKey, ageTier]
  );
  const dailyStats = useMemo(
    () => computeDailyStreakStats(dailyCompletions, todayKey),
    [dailyCompletions, todayKey]
  );
  const dailyGoalProgress = useMemo(
    () =>
      computeDailyGoalProgress({
        matches,
        dailyCompletions,
        todayKey,
      }),
    [matches, dailyCompletions, todayKey]
  );
  const dailyMilestoneStatus = useMemo(
    () => evaluateDailyMilestone(matches, todayKey),
    [matches, todayKey]
  );

  const handleLaunchMilestoneArena = (arenaId: DailyMilestoneArenaId) => {
    switch (arenaId) {
      case 'addition-attack':
      case 'subtraction-sprint':
      case 'multiplication-mastery':
        onLaunchArithmetic(arenaId);
        break;
      case 'equation-foundry':
        onLaunchEquationFoundry();
        break;
      case 'odds-urns':
        onLaunchOddsUrns();
        break;
      case 'factor-grid':
        onLaunchFactorGrid();
        break;
    }
  };
  const [nextDailyCountdown, setNextDailyCountdown] = useState('--:--:--');
  const [currentHour, setCurrentHour] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setNextDailyCountdown(formatCountdownClock(getSecondsUntilNextDaily(now)));
      const hour = now.getHours();
      setCurrentHour((prev) => (prev === hour ? prev : hour));
    };
    const init = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(init);
      window.clearInterval(id);
    };
  }, []);

  const greeting = useMemo(
    () => getStudioGreeting(currentHour, playerName),
    [currentHour, playerName]
  );

  const GreetingIcon =
    greeting.period === 'morning'
      ? Sunrise
      : greeting.period === 'afternoon'
        ? Sun
        : greeting.period === 'evening'
          ? Sunset
          : Moon;

  const greetingIconColor =
    greeting.period === 'morning' || greeting.period === 'afternoon'
      ? 'text-[#B45309]'
      : 'text-[#1D4ED8]';

  return (
    <main className="mx-auto max-w-[1240px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      {/* Hero Split — items-stretch 2-column architectural balance */}
      <section className="grid grid-cols-1 gap-7 lg:grid-cols-12 lg:items-stretch">
        <div className="card-tactile flex flex-col justify-between rounded-2xl p-6 sm:p-9 lg:col-span-7">
          <div>
            <div
              data-testid="studio-time-greeting"
              data-day-period={greeting.period}
              className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs"
            >
              <span className="inline-flex items-center gap-1.5 font-semibold text-[#1C232B]">
                <GreetingIcon
                  className={`h-3.5 w-3.5 shrink-0 ${greetingIconColor}`}
                  aria-hidden="true"
                />
                {greeting.headline}
              </span>
              <span className="text-[#C5BEB0]" aria-hidden="true">
                ·
              </span>
              <span className="font-medium tracking-wide text-[#5A6572]">
                {greeting.subnote}
              </span>
            </div>
            <h1 className="mt-3 font-display text-3xl font-semibold leading-[1.12] tracking-tight text-[#1C232B] sm:text-4xl lg:text-[44px] [text-wrap:balance]">
              Mathematics and probability learned through strategic play.
            </h1>
            <p className="mt-4 max-w-[56ch] text-[15px] leading-relaxed text-[#46515E]">
              Numbercraft brings timed arithmetic fluency, progressive
              multiplication tables, daily chained puzzles, and strategic number
              theory together on one calm drafting desk.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3.5">
            <Tooltip
              content="Launch adaptive Addition, Subtraction, and Multiplication fluency sprints"
              placement="top"
            >
              <button
                type="button"
                data-start="true"
                onClick={() => onLaunchArithmetic('addition-attack')}
                className="btn-cobalt inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
              >
                Play Core Arithmetic
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </button>
            </Tooltip>

            <Tooltip
              content="Claim numbers and outsmart Minimax AI on a territorial divisor grid"
              placement="top"
            >
              <button
                type="button"
                onClick={onLaunchFactorGrid}
                className="inline-flex items-center gap-2 rounded-xl border border-[#D8D0C0] bg-[#FAF8F4] px-4 py-3 text-sm font-semibold text-[#1C232B] shadow-[0_2px_0_#E5DEC9] hover:-translate-y-0.5 hover:border-[#1D4ED8] hover:text-[#1D4ED8] active:translate-y-0 transition-all whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
              >
                <Grid3X3 className="h-4 w-4 shrink-0" aria-hidden="true" />
                Play Factor Grid
              </button>
            </Tooltip>

            <Tooltip
              content="Create a private 6-character room to play Factor Grid with friends"
              placement="top"
            >
              <button
                type="button"
                onClick={onOpenRooms}
                className="inline-flex items-center gap-2 rounded-xl border border-[#D8D0C0] bg-white px-4 py-3 text-sm font-semibold text-[#5A6572] hover:border-[#1D4ED8] hover:text-[#1D4ED8] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
              >
                <Users className="h-4 w-4 shrink-0" aria-hidden="true" />
                Online Rooms
              </button>
            </Tooltip>
          </div>
        </div>

        <div className="card-tactile relative min-h-[260px] overflow-hidden rounded-2xl bg-[#EFECE4] lg:col-span-5">
          <Image
            src={studioHeroImg}
            alt="Warm drafting paper math study desk with ceramic tiles, cobalt and emerald glass marbles, maple dice, and a brass compass"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 42vw"
            className="object-cover"
            referrerPolicy="no-referrer"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/5 rounded-2xl"
          />
        </div>
      </section>

      {/* Daily Math Challenge Spotlight Banner */}
      <section
        aria-label="Today's Daily Math Challenge"
        data-testid="daily-spotlight-banner"
        className="card-tactile mt-7 flex flex-col justify-between gap-5 rounded-2xl border-[#DFC99B] bg-[#FFFDF7] p-5 sm:p-6 lg:flex-row lg:items-center"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <span className="inline-flex items-center gap-1.5 font-mono font-semibold text-[#B45309]">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              Daily Edition #{todayPuzzle.editionNumber} ·{' '}
              {todayPuzzle.formattedDate}
            </span>
            <span className="text-[#C5BEB0]">·</span>
            <span className="inline-flex items-center gap-1 font-mono text-[#5A6572] tabular-nums">
              <Flame className="h-3.5 w-3.5 text-[#B45309]" aria-hidden="true" />
              {dailyStats.currentStreak}d streak
            </span>
            <span className="text-[#C5BEB0]">·</span>
            <span className="inline-flex items-center gap-1 font-mono text-[#5A6572] tabular-nums">
              <Clock className="h-3.5 w-3.5 text-[#1D4ED8]" aria-hidden="true" />
              Resets in {nextDailyCountdown}
            </span>
          </div>
          <h2 className="mt-2 font-display text-xl font-semibold text-[#1C232B] sm:text-2xl">
            Daily Math Challenge: {todayPuzzle.archetypeTitle}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[#46515E]">
            {dailyStats.solvedToday
              ? `Today's timed 3-clue puzzle is stamped complete. Review your solution or return tomorrow for Edition #${todayPuzzle.editionNumber + 1}.`
              : `${todayPuzzle.archetypeTagline} Beat the ${todayPuzzle.timeLimitSeconds}s chronometer to earn unique Daily Mastery Seals.`}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Tooltip
            content={
              dailyStats.solvedToday
                ? 'Inspect your completed Daily Challenge stamp and step breakdown'
                : 'Solve 3 chained clues before the timer runs out to keep your streak alive'
            }
            placement="top"
          >
            <button
              type="button"
              data-testid="open-daily-challenge-btn"
              onClick={onOpenDaily}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold whitespace-nowrap transition-all ${
                dailyStats.solvedToday
                  ? 'border border-[#047857]/40 bg-[#ECFDF5] text-[#047857] hover:bg-[#D1FAE5]'
                  : 'btn-cobalt'
              }`}
            >
              {dailyStats.solvedToday ? (
                <>
                  <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                  View Today’s Stamp
                </>
              ) : (
                <>
                  Solve Today’s Puzzle
                  <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                </>
              )}
            </button>
          </Tooltip>
        </div>
      </section>

      {/* Daily Goal Progress Ring & Consecutive Daily Streak Flame Counter */}
      <DailyGoalRing
        progress={dailyGoalProgress}
        onStartPractice={() => onLaunchArithmetic('addition-attack')}
        onOpenDaily={onOpenDaily}
      />

      {/* Daily Milestone — Rotating Focus Arena with 1.5x Mastery Seal Multiplier */}
      <DailyMilestoneCard
        status={dailyMilestoneStatus}
        onLaunchArena={handleLaunchMilestoneArena}
      />

      {/* Adaptive Tier Bar */}
      <section
        aria-label="Adaptive age tier selector"
        className="mt-9 flex flex-col justify-between gap-4 border-y border-[#E2DCCF] py-5 lg:flex-row lg:items-center"
      >
        <div className="max-w-md">
          <h2 className="font-display text-lg font-semibold text-[#1C232B]">
            Adaptive Age Tier
          </h2>
          <p className="mt-0.5 text-sm text-[#5A6572]">
            Switching tiers dynamically scales arithmetic ranges, multiplication
            stages, and board sizes across every game.
          </p>
        </div>

        <div
          role="group"
          aria-label="Choose student age tier"
          className="inline-flex flex-wrap sm:flex-nowrap items-center gap-1 rounded-xl border border-[#DFD8CA] bg-[#EFECE3] p-1.5 shrink-0"
        >
          {TIER_ORDER.map((tierId) => {
            const spec = TIER_SPECS[tierId];
            const selected = ageTier === tierId;
            return (
              <button
                key={tierId}
                type="button"
                aria-pressed={selected}
                onClick={() => onChangeTier(tierId)}
                className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-all whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] ${
                  selected
                    ? 'bg-white text-[#1C232B] shadow-[0_1px_3px_rgba(28,35,43,0.12)]'
                    : 'text-[#5A6572] hover:text-[#1C232B]'
                }`}
              >
                {spec.label} · {spec.ageRange}
              </button>
            );
          })}
        </div>
      </section>

      {/* Set 01 Playable Core Arithmetic Trio */}
      <section className="mt-9" aria-labelledby="arithmetic-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-[#1D4ED8]">
              Set 01 · Core Arithmetic · Playable Now
            </p>
            <h2
              id="arithmetic-heading"
              className="mt-1 font-display text-2xl font-semibold text-[#1C232B]"
            >
              Core Arithmetic Drills
            </h2>
          </div>
          <p className="font-mono text-xs text-[#5A6572] tabular-nums">
            Scaled for {activeSpec.label} ({activeSpec.ageRange}) · Adjustable
            Timers &amp; Untimed Mode
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {ARITHMETIC_GAME_ORDER.map((gameId) => {
            const game = ARITHMETIC_GAMES[gameId];
            const Icon =
              gameId === 'addition-attack'
                ? Clock
                : gameId === 'subtraction-sprint'
                  ? Zap
                  : Layers;

            const sampleTokens =
              gameId === 'addition-attack'
                ? ageTier === 'explorers'
                  ? ['14', '+', '9', '=', '23']
                  : ageTier === 'challengers'
                    ? ['48', '+', '37', '=', '85']
                    : ['264', '+', '189', '=', '453']
                : gameId === 'subtraction-sprint'
                  ? ageTier === 'explorers'
                    ? ['24', '−', '8', '=', '16']
                    : ageTier === 'challengers'
                      ? ['83', '−', '47', '=', '36']
                      : ['412', '−', '168', '=', '244']
                  : ageTier === 'explorers'
                    ? ['7', '×', '6', '=', '42']
                    : ageTier === 'challengers'
                      ? ['12', '×', '8', '=', '96']
                      : ['17', '×', '14', '=', '238'];

            return (
              <article
                key={gameId}
                className="card-tactile flex flex-col justify-between overflow-hidden rounded-2xl transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_14px_28px_-12px_rgba(28,35,43,0.14)]"
              >
                <div>
                  <div className="flex flex-col justify-center border-b border-[#E5E0D5] bg-[#F8F5EE] px-6 py-5">
                    <div className="flex items-center justify-between text-xs font-mono text-[#5A6572]">
                      <span>{game.shortTag}</span>
                      <span
                        className="font-semibold"
                        style={{ color: game.accentHex }}
                      >
                        {activeSpec.label}
                      </span>
                    </div>
                    <div className="mt-3.5 flex flex-wrap items-center gap-1.5 font-mono text-sm font-semibold tabular-nums">
                      {sampleTokens.map((tok, i) => {
                        const isOp = ['+', '−', '×', '='].includes(tok);
                        const isResult = i === sampleTokens.length - 1;
                        return (
                          <span
                            key={i}
                            className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2.5 ${
                              isResult
                                ? 'border-[#1D4ED8]/40 bg-[#EFF5FF] text-[#1D4ED8]'
                                : isOp
                                  ? 'border-[#D4B88C] bg-[#FDF6E7] text-[#8A5108]'
                                  : 'border-[#D6CFC0] bg-white text-[#1C232B] shadow-[0_2px_0_#D8D0C0]'
                            }`}
                          >
                            {tok}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-6">
                    <h3 className="font-display text-xl font-semibold text-[#1C232B]">
                      {game.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#46515E]">
                      {game.tagline}
                    </p>
                    <p className="mt-4 border-t border-[#ECE7DD] pt-3.5 text-xs text-[#5A6572]">
                      <strong className="font-semibold text-[#1C232B]">
                        {activeSpec.label} Scope:
                      </strong>{' '}
                      {game.tierSummaries[ageTier]}
                    </p>
                  </div>
                </div>

                <div className="px-6 pb-6">
                  <button
                    type="button"
                    data-testid={`launch-${gameId}`}
                    onClick={() => onLaunchArithmetic(gameId)}
                    className="btn-cobalt flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold whitespace-nowrap"
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    Play {game.title}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Strategy & Probability Sets */}
      <section className="mt-10" aria-labelledby="sets-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2
            id="sets-heading"
            className="font-display text-2xl font-semibold text-[#1C232B]"
          >
            Strategy &amp; Probability Studio
          </h2>
          <p className="text-xs text-[#5A6572] font-mono tabular-nums">
            Active Tier: {activeSpec.label} ({activeSpec.ageRange}) ·{' '}
            {matchesCount} {matchesCount === 1 ? 'match' : 'matches'} in
            notebook
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Set 3 Flagship Prototype: Factor Grid */}
          <article className="card-tactile group flex flex-col justify-between overflow-hidden rounded-2xl border-[#1D4ED8]/45 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_16px_32px_-12px_rgba(29,78,216,0.18)]">
            <div>
              <div className="relative h-48 w-full overflow-hidden border-b border-[#E5E0D5] bg-[#F3EFE7]">
                <Image
                  src={factorGridBannerImg}
                  alt="Geometric ceramic number tiles linked by cobalt and ochre factor arcs on drafting paper"
                  fill
                  sizes="(max-width: 1024px) 100vw, 33vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="p-6">
                <p className="text-xs font-semibold text-[#1D4ED8]">
                  Set 03 · Strategy Number Theory · Playable Now
                </p>
                <h3 className="mt-1.5 font-display text-xl font-semibold text-[#1C232B]">
                  Factor Grid
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#46515E]">
                  Claim numbers while your opponent captures all remaining
                  proper divisors. Master primes, deficient vs. abundant
                  numbers, and multi-turn lookahead.
                </p>

                <dl className="mt-4 space-y-1.5 border-t border-[#ECE7DD] pt-4 text-xs text-[#5A6572]">
                  <div className="flex justify-between gap-2">
                    <dt>Board for {activeSpec.label}</dt>
                    <dd className="font-mono font-semibold text-[#1C232B] tabular-nums">
                      1–{activeSpec.boardMax} ({activeSpec.columns}×
                      {Math.ceil(activeSpec.boardMax / activeSpec.columns)})
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Play Modes</dt>
                    <dd className="font-semibold text-[#047857]">
                      Solo · vs. AI · Pass-and-Play
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="px-6 pb-6">
              <Tooltip
                content="Play territorial divisor-capture strategy in Solo, vs. AI, or Pass-and-Play"
                placement="top"
                className="w-full"
              >
                <button
                  type="button"
                  onClick={onLaunchFactorGrid}
                  className="btn-cobalt flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold whitespace-nowrap"
                >
                  <Grid3X3 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Open Factor Grid
                </button>
              </Tooltip>
            </div>
          </article>

          {/* Equation Foundry Live Studio Card */}
          <article className="card-tactile flex flex-col justify-between overflow-hidden rounded-2xl border-[#1D4ED8]/35 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_14px_28px_-12px_rgba(29,78,216,0.16)]">
            <div>
              <div className="flex h-48 flex-col justify-center border-b border-[#E5E0D5] bg-[#F8F5EE] px-6 py-5">
                <p className="text-xs text-[#5A6572] font-mono">
                  Target Number
                </p>
                <p className="mt-1 font-mono text-3xl font-semibold text-[#1C232B] tabular-nums">
                  {ageTier === 'explorers'
                    ? '24'
                    : ageTier === 'challengers'
                      ? '78'
                      : '164'}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 font-mono text-sm font-semibold text-[#1C232B] tabular-nums">
                  {(ageTier === 'explorers'
                    ? ['8', '×', '4', '−', '8']
                    : ageTier === 'challengers'
                      ? ['(', '9', '+', '4', ')', '×', '6']
                      : ['12', '²', '+', '5', '×', '4']
                  ).map((tok, i) => {
                    const isOp = ['+', '−', '×', '(', ')', '²'].includes(tok);
                    return (
                      <span
                        key={i}
                        className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 ${
                          isOp
                            ? 'border-[#D4B88C] bg-[#FDF6E7] text-[#8A5108] shadow-[0_2px_0_#DEC59D]'
                            : 'border-[#D6CFC0] bg-white text-[#1C232B] shadow-[0_2px_0_#D8D0C0]'
                        }`}
                      >
                        {tok}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="p-6">
                <p className="text-xs font-semibold text-[#1D4ED8]">
                  Set 01 Extension · Expression Building · Playable Now
                </p>
                <h3 className="mt-1.5 font-display text-xl font-semibold text-[#1C232B]">
                  Equation Foundry
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#46515E]">
                  Combine tactile number tiles and operators to forge target
                  values step-by-step against the deterministic Expression
                  Solver AI.
                </p>
                <p className="mt-4 border-t border-[#ECE7DD] pt-4 text-xs text-[#5A6572]">
                  <strong className="font-semibold text-[#1C232B]">
                    {activeSpec.label} Scope:
                  </strong>{' '}
                  {activeSpec.arithmeticSummary}
                </p>
              </div>
            </div>

            <div className="px-6 pb-6">
              <Tooltip
                content="Forge target numbers with PEMDAS tiles and compare against Solver AI"
                placement="top"
                className="w-full"
              >
                <button
                  type="button"
                  data-testid="launch-equation-foundry"
                  onClick={onLaunchEquationFoundry}
                  className="btn-cobalt flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold whitespace-nowrap"
                >
                  <Calculator className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Play Equation Foundry
                </button>
              </Tooltip>
            </div>
          </article>

          {/* Set 2 Live Studio Card: Odds & Urns */}
          <article className="card-tactile flex flex-col justify-between overflow-hidden rounded-2xl border-[#047857]/35 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_14px_28px_-12px_rgba(4,120,87,0.16)]">
            <div>
              <div className="flex h-48 flex-col justify-center border-b border-[#E5E0D5] bg-[#F8F5EE] px-6 py-5">
                <div className="flex items-center justify-between text-xs text-[#5A6572] font-mono">
                  <span>Urn Chamber · Safe Odds</span>
                  <span className="font-semibold text-[#047857] tabular-nums">
                    {ageTier === 'explorers'
                      ? '6 / 8 (75%)'
                      : ageTier === 'challengers'
                        ? '7 / 10 (70%)'
                        : 'E[X] = +4.2 pts'}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-5 gap-2.5">
                  {MARBLE_SPECS.map((marble, idx) => (
                    <span
                      key={idx}
                      aria-hidden="true"
                      className="h-8 w-8 rounded-full shadow-[inset_0_2px_3px_rgba(255,255,255,0.45),0_3px_6px_rgba(28,35,43,0.18)]"
                      style={{ background: marble.bg }}
                    />
                  ))}
                </div>
                <p className="mt-3.5 text-xs text-[#5A6572]">
                  Draw without replacement or bank points before a hazard hit.
                </p>
              </div>

              <div className="p-6">
                <p className="text-xs font-semibold text-[#047857]">
                  Set 02 · Modular Probability · Playable Now
                </p>
                <h3 className="mt-1.5 font-display text-xl font-semibold text-[#1C232B]">
                  Odds &amp; Urns
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#46515E]">
                  Inspect live marble urns, twin dice, and conditional spinners.
                  Estimate exact fractions and decide when to press or bank
                  against an EV Bot.
                </p>
                <p className="mt-4 border-t border-[#ECE7DD] pt-4 text-xs text-[#5A6572]">
                  <strong className="font-semibold text-[#1C232B]">
                    {activeSpec.label} Scope:
                  </strong>{' '}
                  {activeSpec.probabilitySummary}
                </p>
              </div>
            </div>

            <div className="px-6 pb-6">
              <Tooltip
                content="Explore Marble Urn, Twin Dice, and Conditional Spinner chambers vs. EV Bot"
                placement="top"
                className="w-full"
              >
                <button
                  type="button"
                  data-testid="launch-odds-urns"
                  onClick={onLaunchOddsUrns}
                  className="btn-cobalt flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold whitespace-nowrap"
                >
                  <Dices className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Play Odds &amp; Urns
                </button>
              </Tooltip>
            </div>
          </article>
        </div>
      </section>

      {/* Daily Mathematician Quote & Reflection */}
      <DailyMathQuoteCard
        dateKey={todayKey}
        formattedDate={todayPuzzle.formattedDate}
      />
    </main>
  );
}
