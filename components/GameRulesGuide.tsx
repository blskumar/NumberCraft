'use client';

import { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Calculator,
  CalendarCheck2,
  Dices,
  Grid3X3,
  Layers,
} from 'lucide-react';
import type { ArithmeticGameId } from '@/lib/types';

export type RulesFilterId =
  | 'all'
  | 'arithmetic'
  | 'equation-foundry'
  | 'odds-urns'
  | 'factor-grid'
  | 'daily';

interface GameRulesGuideProps {
  onLaunchArithmetic: (gameId: ArithmeticGameId) => void;
  onLaunchEquationFoundry: () => void;
  onLaunchOddsUrns: () => void;
  onLaunchFactorGrid: () => void;
  onOpenDaily: () => void;
}

interface VariationRule {
  name: string;
  scope: string;
  rules: string;
  tip: string;
}

interface GameRuleSection {
  id: Exclude<RulesFilterId, 'all'>;
  category: string;
  title: string;
  subtitle: string;
  objective: string;
  howToPlay: string[];
  tierScaling: {
    explorers: string;
    challengers: string;
    strategists: string;
  };
  variations: VariationRule[];
  primaryActionLabel: string;
  secondaryActions?: { label: string; gameId: ArithmeticGameId }[];
}

const RULE_SECTIONS: GameRuleSection[] = [
  {
    id: 'arithmetic',
    category: 'Set 01 · Core Arithmetic',
    title: 'Core Arithmetic Drills',
    subtitle:
      'Build rapid mental computation, streak accuracy, and progressive table mastery across three dedicated drill modes.',
    objective:
      'Solve as many problems accurately as possible before the clock expires—or practice calmly in Untimed Mode—while raising your Adaptive Difficulty Band (Levels 1–5).',
    howToPlay: [
      'Pick a drill (Addition Attack, Subtraction Sprint, or Multiplication Mastery) and choose a pace: 60s Sprint, 90s Relaxed, or Untimed.',
      'Type your answer with the keyboard or on-screen keypad and press Enter. Consecutive correct answers build streak multipliers and trigger adaptive level-ups.',
      'Misses show immediate step-by-step mental math feedback without locking you out, and every completed round updates your Performance Dashboard.',
    ],
    tierScaling: {
      explorers: 'Sums to 40 · Borrowing within 50 · 2×–6× tables',
      challengers: 'Sums 25–190 · Borrowing across tens · 3×–15× tables',
      strategists: 'Multi-digit carries · 3-digit differences · Up to 19× & squares',
    },
    variations: [
      {
        name: 'Addition Attack',
        scope: 'Timed Sprint & Combo Streaks',
        rules:
          'Add pairs rapidly to maintain an unbroken streak. Every 3+ streak boosts round score and lifts your adaptive band toward tougher bridging carries.',
        tip: 'Break two-digit sums into tens first, then bridge the ones digit.',
      },
      {
        name: 'Subtraction Sprint',
        scope: 'Clean Borrowing & Mental Differences',
        rules:
          'Compute exact positive differences under your chosen timer. Adaptive bands progress from clean tens differences to multi-column regrouping.',
        tip: 'Count up from the smaller number to the nearest ten to avoid borrowing slips.',
      },
      {
        name: 'Multiplication Mastery',
        scope: '5 Progressive Table Stages',
        rules:
          'Advance sequentially through 5 escalating stages within a single session—moving from foundational facts to 12×12, teen tables, and perfect squares.',
        tip: 'Use nearby anchors (like 10× or 5×) and adjust by one group for tricky 7×, 8×, or 14× products.',
      },
      {
        name: 'Adaptive Band & Untimed Practice',
        scope: 'Session Modifier (All 3 Drills)',
        rules:
          'Toggle Adaptive Difficulty on to auto-scale problem complexity from Level 1 to Level 5 based on live accuracy, or switch to Untimed Mode to focus purely on accuracy.',
        tip: 'Keep accuracy at or above 85% across 3 rounds to earn studio accuracy Mastery Seals.',
      },
    ],
    primaryActionLabel: 'Play Addition Attack',
    secondaryActions: [
      { label: 'Subtraction Sprint', gameId: 'subtraction-sprint' },
      { label: 'Multiplication Mastery', gameId: 'multiplication-mastery' },
    ],
  },
  {
    id: 'equation-foundry',
    category: 'Set 01 Extension · Expression Building',
    title: 'Equation Foundry',
    subtitle:
      'Combine tactile number tiles and mathematical operators to forge target numbers step-by-step.',
    objective:
      'Construct a valid mathematical expression using the round’s available number tiles so that it evaluates to the exact Target Number—or closer than the deterministic Expression Solver AI.',
    howToPlay: [
      'Inspect the Target Number and your tray of numbered ceramic tiles. Each number tile can be placed at most once per expression.',
      'Click tiles and operators (+, −, ×, ÷, parentheses, or powers for Strategists) to assemble your formula. The live evaluator previews your current result using standard order of operations.',
      'Submit your expression to score full points for an exact match plus an efficiency bonus, then compare your formula against the Expression Solver AI benchmark.',
    ],
    tierScaling: {
      explorers: 'Targets 10–35 · + and − operators',
      challengers: 'Targets 30–140 · +, −, ×, ÷ and parentheses ( )',
      strategists: 'Targets 60–320 · All 4 operations, parentheses, and exponents',
    },
    variations: [
      {
        name: 'Solo Foundry (Exact Forge)',
        scope: 'Self-Paced Expression Crafting',
        rules:
          'Take your time crafting the cleanest exact equation for each target across a 5-round set. Exact matches award full credit and efficiency bonuses for compact formulas.',
        tip: 'Check if a large tile multiplied by a small sum lands within 1–5 of the target first.',
      },
      {
        name: 'vs. Expression Solver AI',
        scope: 'Head-to-Head Benchmark Match',
        rules:
          'Both you and the deterministic Solver AI work from the identical tile tray. Beat or tie the AI’s proximity and efficiency across 5 rounds to win the match.',
        tip: 'Parentheses let you turn two modest tiles into a high-leverage factor: (9 + 4) × 6 = 78.',
      },
      {
        name: 'Parentheses & Exponent Challenges',
        scope: 'Challengers & Strategists Tier Variant',
        rules:
          'Unlocks grouping brackets and exponent operators so you can scale small base tiles quickly toward larger three-digit targets.',
        tip: 'Watch order of operations: multiplication and exponents evaluate before addition unless wrapped in brackets.',
      },
    ],
    primaryActionLabel: 'Play Equation Foundry',
  },
  {
    id: 'odds-urns',
    category: 'Set 02 · Modular Probability',
    title: 'Odds & Urns',
    subtitle:
      'Inspect live sample spaces, calibrate exact fractional odds, and choose when to Press or Bank against an Expected-Value Bot.',
    objective:
      'Read the exact probability of a safe outcome in each chamber, lock in a calibrated odds estimate, and decide whether pressing for extra points has positive Expected Value compared to banking safely.',
    howToPlay: [
      'Choose a chamber (Marble Urn, Twin Dice, or Conditional Spinner) and inspect the live visual sample space.',
      'Use the Probability Calibration slider to estimate the exact chance of a safe outcome—accurate estimates earn calibration bonus points.',
      'Click Press to draw, roll, or spin and grow your round pot, or click Bank to secure your accumulated points before a hazard ends the turn. Outscore the EV Bot across the match.',
    ],
    tierScaling: {
      explorers: 'Marble Urn with replacement · Clear small denominators',
      challengers: 'Without replacement · 36-outcome Twin Dice sums',
      strategists: 'Conditional Spinner upgrades · Tight EV decision margins',
    },
    variations: [
      {
        name: 'Marble Urn (With Replacement)',
        scope: 'Explorers Chamber · Independent Draws',
        rules:
          'Every drawn marble is returned to the urn before the next draw, so safe vs. hazard probabilities remain constant throughout the round.',
        tip: 'Even when odds stay fixed, each extra press puts your larger accumulated pot at risk—bank once risk outweighs reward.',
      },
      {
        name: 'Marble Urn (Without Replacement)',
        scope: 'Challengers & Strategists · Shrinking Sample Space',
        rules:
          'Each safe marble you draw stays out of the urn, shrinking both the numerator and denominator and raising the hazard probability on the very next draw.',
        tip: 'Recalculate the remaining safe/total fraction after every single draw—two safe draws in a row can flip a safe urn into a trap.',
      },
      {
        name: 'Twin Dice Chamber',
        scope: '36-Outcome Sum Distribution',
        rules:
          'Roll two six-sided dice where target safe sums vs. hazard sums follow the 36-combination triangular distribution (7 occurs 6/36 ways, while 2 and 12 occur only 1/36 each).',
        tip: 'Count favorable pairs out of 36 rather than counting how many sum labels exist.',
      },
      {
        name: 'Conditional Spinner',
        scope: 'Multi-Sector Wheel & Upgrade Conditions',
        rules:
          'Spin a weighted multi-sector probability wheel where landing on upgrade or bonus wedges shifts your conditional payout and next-spin expected value.',
        tip: 'Compare the wheel’s expected gain (safe chance × reward) against expected loss (hazard chance × current pot).',
      },
    ],
    primaryActionLabel: 'Play Odds & Urns',
  },
  {
    id: 'factor-grid',
    category: 'Set 03 · Strategy Number Theory',
    title: 'Factor Grid',
    subtitle:
      'Claim numbers on a shared board while your opponent automatically captures every remaining proper divisor of your pick.',
    objective:
      'End the game with a higher total sum of claimed tiles than your opponent by choosing high-value primes and deficient numbers while denying generous divisor payouts.',
    howToPlay: [
      'On your turn, pick any unclaimed tile that still has at least one unclaimed proper divisor on the board (for example, picking 12 gives you 12 points while your opponent captures 1, 2, 3, 4, and 6 = 16 points).',
      'Hover or focus any tile to preview your net gain versus the divisors your opponent will capture before committing.',
      'When no remaining tile has an unclaimed proper divisor, the opponent sweeps all leftover uncaptured tiles and the highest total score wins.',
    ],
    tierScaling: {
      explorers: '1–20 Grid (5×4) · Fast intuitive factor recognition',
      challengers: '1–36 Grid (6×6) · Rich prime & abundant trade-offs',
      strategists: '1–49 Grid (7×7) · Deep multi-turn Alpha-Beta lookahead',
    },
    variations: [
      {
        name: 'Classic Ruleset',
        scope: 'Standard Taxman / Factor Game',
        rules:
          'Each tile is worth its face value. Legal moves require at least one unclaimed proper divisor; leftover tiles with no unclaimed divisors sweep to the opponent at game end.',
        tip: 'Open with the highest prime on the board—its only proper divisor is 1, giving you a huge net lead.',
      },
      {
        name: 'Prime Trap Variant',
        scope: 'Bonus Reward for Strategic Prime Control',
        rules:
          'Claiming a prime number while 1 is still available awards an extra prime-capture bonus, raising the stakes of controlling early turns before 1 disappears.',
        tip: 'Once 1 is claimed, every remaining prime becomes unplayable and sweeps to your opponent—plan your prime timing carefully.',
      },
      {
        name: 'Solo Taxman Mode',
        scope: 'Single-Player Optimization',
        rules:
          'You take every turn while the Divisor Bank automatically collects all remaining proper divisors of each move. Try to beat the Taxman’s total score.',
        tip: 'Avoid abundant numbers (like 12, 24, or 36) until most of their factors are already gone from the board.',
      },
      {
        name: 'vs. Minimax AI · Pass-and-Play · Online Rooms',
        scope: 'Turn-Based Competitive Modes',
        rules:
          'Alternate turns against Numbercraft’s deterministic Alpha-Beta Minimax strategist, share one screen locally with a friend, or host a 6-character Online Room code.',
        tip: 'Look one move ahead: sometimes taking a modest composite tile denies your opponent a massive factor-free tile next turn.',
      },
    ],
    primaryActionLabel: 'Play Factor Grid',
  },
  {
    id: 'daily',
    category: 'Daily Vault · Timed 3-Clue Puzzle',
    title: 'Daily Math Challenge',
    subtitle:
      'One shared daily math edition per calendar day with four rotating puzzle archetypes and streak tracking.',
    objective:
      'Crack all 3 sequential clues inside the 90-second chronometer to unlock today’s vault, earn streak bonuses, and add an emerald bar to your 30-day consistency chart.',
    howToPlay: [
      'Open Today’s Daily Challenge—every student gets the exact same numbered edition for today’s calendar date, scaled to their active age tier.',
      'Solve Step 1, Step 2, and Step 3 before the 90-second chronometer runs out. Optional hints are available if you get stuck, with a small score deduction.',
      'Solving consecutive calendar days grows your Daily Streak counter, unlocks Daily Mastery Seals, and logs directly into your 30-Day Consistency Chart.',
    ],
    tierScaling: {
      explorers: 'Single & two-digit numbers · Gentle divisor & scale steps',
      challengers: 'Multi-step clues · Two-variable balance & vault locks',
      strategists: 'Tighter prime, modular, and algebraic deduction chains',
    },
    variations: [
      {
        name: 'Mystery Number Deduction',
        scope: 'Number Properties & Elimination',
        rules:
          'Use three progressive clues—such as divisibility rules, prime/composite bounds, and digit sums—to isolate the unique secret number.',
        tip: 'List the small candidate set from the tightest divisibility clue first, then test digit sums.',
      },
      {
        name: 'Algebraic Balance Scale',
        scope: 'Visual System of Equations',
        rules:
          'Deduce the exact numeric value of each shape or symbol across three balanced scales, substituting earlier answers into the final lock.',
        tip: 'Start with a scale containing identical symbols to solve one unknown immediately.',
      },
      {
        name: 'Equation Vault',
        scope: 'Missing Operands & Arithmetic Locks',
        rules:
          'Restore missing numbers or operators across three linked equations whose solutions unlock the vault combination.',
        tip: 'Work backwards from the target result using inverse operations (division for multiplication, subtraction for addition).',
      },
      {
        name: 'Divisor & Sequence Cipher',
        scope: 'Pattern Recognition & Number Theory',
        rules:
          'Spot the hidden growth rule—arithmetic steps, second differences, factor chains, or square offsets—to decode the next term in each stage.',
        tip: 'Check the difference between consecutive terms first; if it grows steadily, look at the difference of differences.',
      },
    ],
    primaryActionLabel: 'Play Today’s Daily',
  },
];

const FILTER_TABS: { id: RulesFilterId; label: string }[] = [
  { id: 'all', label: 'All Games' },
  { id: 'arithmetic', label: 'Core Arithmetic' },
  { id: 'equation-foundry', label: 'Equation Foundry' },
  { id: 'odds-urns', label: 'Odds & Urns' },
  { id: 'factor-grid', label: 'Factor Grid' },
  { id: 'daily', label: 'Daily Challenge' },
];

function getSectionIcon(id: GameRuleSection['id']) {
  switch (id) {
    case 'arithmetic':
      return Calculator;
    case 'equation-foundry':
      return Layers;
    case 'odds-urns':
      return Dices;
    case 'factor-grid':
      return Grid3X3;
    case 'daily':
      return CalendarCheck2;
  }
}

export default function GameRulesGuide({
  onLaunchArithmetic,
  onLaunchEquationFoundry,
  onLaunchOddsUrns,
  onLaunchFactorGrid,
  onOpenDaily,
}: GameRulesGuideProps) {
  const [activeFilter, setActiveFilter] = useState<RulesFilterId>('all');

  const visibleSections =
    activeFilter === 'all'
      ? RULE_SECTIONS
      : RULE_SECTIONS.filter((s) => s.id === activeFilter);

  const handlePrimaryLaunch = (id: GameRuleSection['id']) => {
    switch (id) {
      case 'arithmetic':
        onLaunchArithmetic('addition-attack');
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
      case 'daily':
        onOpenDaily();
        break;
    }
  };

  return (
    <main
      data-testid="game-rules-guide"
      className="mx-auto max-w-[1120px] px-4 py-8 sm:px-6 lg:px-8"
    >
      {/* Page Header */}
      <div className="border-b border-[#E5E0D5] pb-5">
        <p className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1D4ED8]">
          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Studio Handbook · 5 Games · 19 Playable Variations</span>
        </p>
        <h1 className="mt-1.5 font-display text-3xl font-semibold text-[#1C232B]">
          Game Rules &amp; Variations Guide
        </h1>
        <p className="mt-2 max-w-[68ch] text-sm leading-relaxed text-[#46515E]">
          Everything you need to master each Numbercraft arena—clear scoring
          rules, every playable variation, strategy pointers, and how age tiers
          scale the math.
        </p>

        {/* Interactive Game Filter Control */}
        <div
          role="tablist"
          aria-label="Filter game rules by studio game"
          className="mt-5 inline-flex max-w-full flex-nowrap items-center gap-1 overflow-x-auto rounded-xl border border-[#DFD8CA] bg-[#EFECE3] p-1"
        >
          {FILTER_TABS.map((tab) => {
            const selected = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                data-testid={`rules-filter-${tab.id}`}
                aria-selected={selected}
                onClick={() => setActiveFilter(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                  selected
                    ? 'bg-white text-[#1C232B] shadow-xs'
                    : 'text-[#5A6572] hover:text-[#1C232B]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Rules & Variations Sections */}
      <div className="mt-7 space-y-6">
        {visibleSections.map((section) => {
          const SectionIcon = getSectionIcon(section.id);
          return (
            <article
              key={section.id}
              data-testid={`rules-section-${section.id}`}
              className="card-tactile rounded-2xl p-6 sm:p-7"
            >
              {/* Section Header + Direct Launch */}
              <div className="flex flex-col justify-between gap-4 border-b border-[#ECE7DD] pb-5 md:flex-row md:items-start">
                <div>
                  <p className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5A6572]">
                    <SectionIcon
                      className="h-3.5 w-3.5 text-[#1D4ED8]"
                      aria-hidden="true"
                    />
                    <span>{section.category}</span>
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-semibold text-[#1C232B]">
                    {section.title}
                  </h2>
                  <p className="mt-1.5 max-w-[66ch] text-sm leading-relaxed text-[#46515E]">
                    {section.subtitle}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    data-testid={`rules-launch-${section.id}`}
                    onClick={() => handlePrimaryLaunch(section.id)}
                    className="btn-cobalt inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap shrink-0"
                  >
                    {section.primaryActionLabel}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  {section.secondaryActions?.map((act) => (
                    <button
                      key={act.gameId}
                      type="button"
                      onClick={() => onLaunchArithmetic(act.gameId)}
                      className="inline-flex items-center gap-1 rounded-xl border border-[#D8D1C4] bg-white px-3 py-2 text-xs font-semibold text-[#1C232B] hover:border-[#1D4ED8] hover:text-[#1D4ED8] transition-colors whitespace-nowrap shrink-0"
                    >
                      {act.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Objective + Core Rules + Age Tier Scaling */}
              <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="lg:col-span-7">
                  <h3 className="text-sm font-semibold text-[#1C232B]">
                    Core Rules &amp; Scoring
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#46515E]">
                    <strong className="font-semibold text-[#1C232B]">
                      Objective:{' '}
                    </strong>
                    {section.objective}
                  </p>
                  <ol className="mt-3 space-y-2 text-sm leading-relaxed text-[#46515E]">
                    {section.howToPlay.map((step, index) => (
                      <li key={step} className="flex items-start gap-2.5">
                        <span className="mt-0.5 font-mono text-xs font-semibold text-[#1D4ED8] tabular-nums">
                          0{index + 1}.
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="border-t border-[#ECE7DD] pt-4 lg:col-span-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
                  <h3 className="text-sm font-semibold text-[#1C232B]">
                    Age Tier Scaling
                  </h3>
                  <dl className="mt-2.5 space-y-3 text-xs leading-relaxed">
                    <div>
                      <dt className="font-mono font-semibold text-[#047857]">
                        Explorers · Ages 8–10
                      </dt>
                      <dd className="mt-0.5 text-[#46515E]">
                        {section.tierScaling.explorers}
                      </dd>
                    </div>
                    <div className="border-t border-[#ECE7DD] pt-2.5">
                      <dt className="font-mono font-semibold text-[#1D4ED8]">
                        Challengers · Ages 11–13
                      </dt>
                      <dd className="mt-0.5 text-[#46515E]">
                        {section.tierScaling.challengers}
                      </dd>
                    </div>
                    <div className="border-t border-[#ECE7DD] pt-2.5">
                      <dt className="font-mono font-semibold text-[#B45309]">
                        Strategists · Ages 14–16
                      </dt>
                      <dd className="mt-0.5 text-[#46515E]">
                        {section.tierScaling.strategists}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* Playable Variations Matrix */}
              <div className="mt-6 border-t border-[#ECE7DD] pt-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[#1C232B]">
                    Playable Variations ({section.variations.length})
                  </h3>
                  <span className="text-xs text-[#5A6572]">
                    Rules &amp; winning strategy for every mode
                  </span>
                </div>

                <div className="mt-3.5 grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
                  {section.variations.map((variation) => (
                    <div
                      key={variation.name}
                      className="border-t border-[#ECE7DD] pt-3.5"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                        <h4 className="font-display text-base font-semibold text-[#1C232B]">
                          {variation.name}
                        </h4>
                        <span className="font-mono text-[11px] text-[#5A6572]">
                          {variation.scope}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-[#46515E]">
                        {variation.rules}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-[#5A6572]">
                        <strong className="font-semibold text-[#047857]">
                          Strategy Tip:{' '}
                        </strong>
                        {variation.tip}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
