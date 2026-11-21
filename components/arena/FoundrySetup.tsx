import { DIFFICULTIES, TIER_ORDER } from './foundry-constants';
import { FOUNDRY_OPERATORS_BY_TIER } from '@/lib/equation-foundry-engine';
import { TIER_SPECS } from '@/lib/factor-grid-engine';
import { ArrowRight, Bot, Calculator, User } from 'lucide-react';
import type { FoundryCtx } from './useEquationFoundryArena';

export default function FoundrySetup({ r }: { r: FoundryCtx }) {
  const {
    ageTier,
    aiDifficulty,
    mode,
    onChangeTier,
    setAiDifficulty,
    setMode,
    startSession,
  } = r;
  return (
        <section className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="card-tactile rounded-2xl p-6 sm:p-8 lg:col-span-8">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#B45309]">
              <Calculator className="h-4 w-4" aria-hidden="true" />
              <span>5-Round Expression Crafting Session</span>
            </div>
            <h2 className="mt-2 font-display text-2xl font-semibold text-[#1C232B] sm:text-3xl">
              Forge the target number from five ceramic tiles.
            </h2>
            <p className="mt-2.5 max-w-[60ch] text-sm leading-relaxed text-[#46515E]">
              Each round deals five number tiles and one target. Combine tiles
              with order-of-operations keys to match the target exactly—each
              number tile may be used at most once, while operators are
              unlimited.
            </p>

            {/* Tier Selector */}
            <div className="mt-6">
              <p className="text-xs font-semibold text-[#1C232B]">
                1. Choose Adaptive Age Tier
              </p>
              <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {TIER_ORDER.map((t) => {
                  const spec = TIER_SPECS[t];
                  const selected = ageTier === t;
                  const ops = FOUNDRY_OPERATORS_BY_TIER[t].join(' ');
                  return (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onChangeTier(t)}
                      className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition-all ${
                        selected
                          ? 'border-[#1D4ED8] bg-[#EFF5FF] text-[#1C232B] shadow-[0_2px_0_#BFDBFE]'
                          : 'border-[#E2DCCF] bg-[#FAF8F4] text-[#46515E] hover:border-[#1D4ED8]/50'
                      }`}
                    >
                      <span className="text-sm font-semibold text-[#1C232B]">
                        {spec.label}{' '}
                        <span className="font-mono text-xs font-normal text-[#5A6572]">
                          ({spec.ageRange})
                        </span>
                      </span>
                      <span className="mt-1 font-mono text-xs font-semibold text-[#1D4ED8]">
                        Keys: {ops}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mode Selector */}
            <div className="mt-6">
              <p className="text-xs font-semibold text-[#1C232B]">
                2. Play Mode &amp; Expression Solver AI
              </p>
              <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  aria-pressed={mode === 'vs-ai'}
                  onClick={() => setMode('vs-ai')}
                  className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                    mode === 'vs-ai'
                      ? 'border-[#1D4ED8] bg-[#EFF5FF]'
                      : 'border-[#E2DCCF] bg-white hover:border-[#1D4ED8]/50'
                  }`}
                >
                  <Bot className="mt-0.5 h-5 w-5 shrink-0 text-[#1D4ED8]" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-[#1C232B]">
                      vs. Expression Solver AI
                    </p>
                    <p className="mt-0.5 text-xs text-[#46515E]">
                      Compete across 5 targets and inspect the solver’s
                      step-by-step tree after each round.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  aria-pressed={mode === 'solo'}
                  onClick={() => setMode('solo')}
                  className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                    mode === 'solo'
                      ? 'border-[#1D4ED8] bg-[#EFF5FF]'
                      : 'border-[#E2DCCF] bg-white hover:border-[#1D4ED8]/50'
                  }`}
                >
                  <User className="mt-0.5 h-5 w-5 shrink-0 text-[#047857]" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-[#1C232B]">
                      Solo Foundry Studio
                    </p>
                    <p className="mt-0.5 text-xs text-[#46515E]">
                      Calm self-paced puzzle crafting with live PEMDAS evaluation
                      and optional strategy hints.
                    </p>
                  </div>
                </button>
              </div>

              {mode === 'vs-ai' && (
                <div className="mt-3.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {DIFFICULTIES.map((d) => {
                    const active = aiDifficulty === d.id;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setAiDifficulty(d.id)}
                        className={`rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
                          active
                            ? 'border-[#1D4ED8] bg-white text-[#1C232B] shadow-[0_2px_0_#D8D0C0]'
                            : 'border-[#E5E0D5] bg-[#FAF8F4] text-[#5A6572] hover:text-[#1C232B]'
                        }`}
                      >
                        <p className="text-xs font-semibold text-[#1C232B]">
                          {d.label}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#5A6572]">
                          {d.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                data-testid="start-foundry-btn"
                onClick={() => startSession(ageTier)}
                className="btn-cobalt inline-flex min-h-[46px] items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold"
              >
                Start Equation Foundry
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="font-mono text-xs text-[#5A6572]">
                5 rounds · Guaranteed exact solution on every deal
              </span>
            </div>
          </div>

          {/* Right Preview Blueprint Card */}
          <aside className="card-tactile flex flex-col justify-between rounded-2xl bg-[#FFFDF9] p-6 lg:col-span-4">
            <div>
              <p className="font-mono text-xs font-semibold text-[#5A6572]">
                Scoring &amp; Craft Rules
              </p>
              <h3 className="mt-1.5 font-display text-xl font-semibold text-[#1C232B]">
                Precision + Order of Operations
              </h3>
              <dl className="mt-4 space-y-3 border-t border-[#ECE7DD] pt-4 text-xs text-[#46515E]">
                <div className="flex items-start justify-between gap-3">
                  <dt className="font-semibold text-[#1C232B]">Exact Target Match</dt>
                  <dd className="font-mono font-semibold text-[#047857] tabular-nums">
                    +100 pts
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="font-semibold text-[#1C232B]">3+ Tile Craft Bonus</dt>
                  <dd className="font-mono font-semibold text-[#1D4ED8] tabular-nums">
                    +15 pts
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="font-semibold text-[#1C232B]">Close Approximation (≤5 away)</dt>
                  <dd className="font-mono font-semibold text-[#B45309] tabular-nums">
                    20–68 pts
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="font-semibold text-[#1C232B]">Strategy Hint</dt>
                  <dd className="font-mono text-[#5A6572] tabular-nums">
                    −15 pts
                  </dd>
                </div>
              </dl>
            </div>

            <div className="mt-6 rounded-xl border border-[#E5E0D5] bg-[#FAF8F4] p-4">
              <p className="font-mono text-[11px] font-semibold text-[#B45309]">
                PEMDAS Live Preview
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[#46515E]">
                Parentheses and exponents evaluate before multiplication and
                division—watch your expression value update in real time as you
                place tiles.
              </p>
            </div>
          </aside>
        </section>
  );
}
