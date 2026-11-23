import { PRIME_TRAP_BONUS, TIER_SPECS } from '@/lib/factor-grid-engine';
import { type AgeTier, type AiDifficulty, type PlayMode } from '@/lib/types';
import { ArrowLeft, Bot, User, Users } from 'lucide-react';
import type { FactorGridCtx } from './useFactorGrid';

export default function FactorGridSetup({ r }: { r: FactorGridCtx }) {
  const {
    ageTier, aiDifficulty, mode, onBackToStudio, onChangeTier, onOpenRooms,
    p1Input, p2Input, setAiDifficulty, setCustomP1Name, setMode, setP2Input,
    setVariant, setupSpec, startNewMatch, variant,
  } = r;
  return (
      <main className="mx-auto max-w-[1040px] px-4 py-8 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onBackToStudio}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#5A6572] hover:text-[#1C232B] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Games
        </button>

        <div className="card-tactile mt-5 rounded-2xl p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#ECE7DD] pb-6">
            <div>
              <p className="text-xs font-semibold text-[#1D4ED8]">
                Set 03 · Strategy Number Theory · Interactive Prototype
              </p>
              <h1 className="mt-1.5 font-display text-3xl font-semibold text-[#1C232B]">
                Factor Grid
              </h1>
              <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-[#46515E]">
                Choose a number that still has at least one unclaimed proper
                divisor. You score the number you pick, and your opponent
                automatically collects all of its remaining proper divisors.
              </p>
            </div>
            <div className="text-right font-mono text-xs text-[#5A6572] tabular-nums">
              <p className="font-semibold text-[#1C232B]">
                Grid 1–{setupSpec.boardMax}
              </p>
              <p>
                {setupSpec.label} ({setupSpec.ageRange})
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Left Config Controls */}
            <div className="space-y-6 lg:col-span-7">
              <div>
                <label className="block text-xs font-semibold text-[#1C232B]">
                  1. Select Play Mode
                </label>
                <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  {[
                    {
                      id: 'vs-ai' as PlayMode,
                      title: 'Human vs. AI',
                      desc: 'Minimax strategist',
                      icon: Bot,
                    },
                    {
                      id: 'solo' as PlayMode,
                      title: 'Solo · Taxman',
                      desc: 'Beat the collector',
                      icon: User,
                    },
                    {
                      id: 'local' as PlayMode,
                      title: 'Pass-and-Play',
                      desc: '2 players, 1 device',
                      icon: Users,
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    const active = mode === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setMode(item.id)}
                        className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition-all ${
                          active
                            ? 'border-[#1D4ED8] bg-[#EFF6FF] text-[#1C232B] shadow-[0_2px_0_#1D4ED8]'
                            : 'border-[#DFD8CA] bg-[#FAF8F4] text-[#46515E] shadow-[0_2px_0_#E7E1D4] hover:border-[#B8B0A0]'
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 ${active ? 'text-[#1D4ED8]' : 'text-[#5A6572]'}`}
                          aria-hidden="true"
                        />
                        <span className="mt-2 text-sm font-semibold text-[#1C232B]">
                          {item.title}
                        </span>
                        <span className="mt-0.5 text-xs text-[#5A6572]">
                          {item.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {mode === 'vs-ai' && (
                <div>
                  <label className="block text-xs font-semibold text-[#1C232B]">
                    2. AI Opponent Strength
                  </label>
                  <div className="mt-2.5 inline-flex flex-wrap gap-1 rounded-xl border border-[#DFD8CA] bg-[#EFECE3] p-1">
                    {(
                      [
                        { id: 'apprentice', label: 'Apprentice (Gentle)' },
                        { id: 'scholar', label: 'Scholar (Tactical)' },
                        { id: 'master', label: 'Master (Minimax)' },
                      ] as { id: AiDifficulty; label: string }[]
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        aria-pressed={aiDifficulty === opt.id}
                        onClick={() => setAiDifficulty(opt.id)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                          aiDifficulty === opt.id
                            ? 'bg-white text-[#1C232B] shadow-xs'
                            : 'text-[#5A6572] hover:text-[#1C232B]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {mode === 'local' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="p1-name"
                      className="block text-xs font-semibold text-[#1C232B]"
                    >
                      Player 1 Name
                    </label>
                    <input
                      id="p1-name"
                      type="text"
                      maxLength={24}
                      value={p1Input}
                      onChange={(e) => setCustomP1Name(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-[#D8D1C4] bg-white px-3 py-2 text-sm text-[#1C232B] focus:border-[#1D4ED8] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="p2-name"
                      className="block text-xs font-semibold text-[#1C232B]"
                    >
                      Player 2 Name
                    </label>
                    <input
                      id="p2-name"
                      type="text"
                      maxLength={24}
                      value={p2Input}
                      onChange={(e) => setP2Input(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-[#D8D1C4] bg-white px-3 py-2 text-sm text-[#1C232B] focus:border-[#1D4ED8] focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-[#1C232B]">
                    Adaptive Board Tier
                  </label>
                  <div className="mt-2 flex flex-col gap-1.5">
                    {(['explorers', 'challengers', 'strategists'] as AgeTier[]).map(
                      (tid) => {
                        const t = TIER_SPECS[tid];
                        const active = ageTier === tid;
                        return (
                          <button
                            key={tid}
                            type="button"
                            aria-pressed={active}
                            onClick={() => onChangeTier(tid)}
                            className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs transition-all ${
                              active
                                ? 'border-[#1D4ED8] bg-[#EFF6FF] font-semibold text-[#1C232B]'
                                : 'border-[#E2DCCF] bg-[#FAF8F4] text-[#5A6572] hover:text-[#1C232B]'
                            }`}
                          >
                            <span>
                              {t.label} ({t.ageRange})
                            </span>
                            <span className="font-mono tabular-nums">
                              1–{t.boardMax}
                            </span>
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C232B]">
                    Rule Variant
                  </label>
                  <div className="mt-2 flex flex-col gap-1.5">
                    <button
                      type="button"
                      aria-pressed={variant === 'classic'}
                      onClick={() => setVariant('classic')}
                      className={`rounded-xl border px-3.5 py-2.5 text-left text-xs transition-all ${
                        variant === 'classic'
                          ? 'border-[#1D4ED8] bg-[#EFF6FF] text-[#1C232B]'
                          : 'border-[#E2DCCF] bg-[#FAF8F4] text-[#5A6572]'
                      }`}
                    >
                      <span className="block font-semibold text-[#1C232B]">
                        Classic Factor Capture
                      </span>
                      <span className="text-[#5A6572]">
                        Pure divisor scoring across the grid.
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-pressed={variant === 'prime-trap'}
                      onClick={() => setVariant('prime-trap')}
                      className={`rounded-xl border px-3.5 py-2.5 text-left text-xs transition-all ${
                        variant === 'prime-trap'
                          ? 'border-[#1D4ED8] bg-[#EFF6FF] text-[#1C232B]'
                          : 'border-[#E2DCCF] bg-[#FAF8F4] text-[#5A6572]'
                      }`}
                    >
                      <span className="block font-semibold text-[#1C232B]">
                        Prime Trap (+{PRIME_TRAP_BONUS} bonus)
                      </span>
                      <span className="text-[#5A6572]">
                        Extra points for claiming prime numbers.
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Quick-Rule Notebook Card */}
            <aside className="flex flex-col justify-between rounded-xl border border-[#E5E0D5] bg-[#FAF8F4] p-5 lg:col-span-5">
              <div>
                <h2 className="font-display text-lg font-semibold text-[#1C232B]">
                  How a Turn Works
                </h2>
                <ol className="mt-3 space-y-2.5 text-sm text-[#46515E]">
                  <li>
                    <strong className="font-semibold text-[#1C232B]">
                      1. Pick an open tile:
                    </strong>{' '}
                    It must have at least one unclaimed proper divisor.
                  </li>
                  <li>
                    <strong className="font-semibold text-[#1C232B]">
                      2. Preview the trade:
                    </strong>{' '}
                    Hovering highlights your opponent&apos;s captured divisors
                    in ochre gold before you commit.
                  </li>
                  <li>
                    <strong className="font-semibold text-[#1C232B]">
                      3. Spot primes &amp; traps:
                    </strong>{' '}
                    Large primes only give away <span className="font-mono">1</span>
                    , while abundant numbers like{' '}
                    <span className="font-mono">24</span> can hand away more
                    points than they earn!
                  </li>
                </ol>

                <div className="mt-5 border-t border-[#E5E0D5] pt-4 text-xs text-[#5A6572]">
                  Want to play across two devices?{' '}
                  <button
                    type="button"
                    onClick={onOpenRooms}
                    className="font-semibold text-[#1D4ED8] underline underline-offset-2 hover:text-[#1E40AF]"
                  >
                    Preview Online Room Codes
                  </button>
                </div>
              </div>

              <button
                type="button"
                data-start="true"
                onClick={() => startNewMatch()}
                className="btn-cobalt mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold whitespace-nowrap"
              >
                Start Factor Grid
              </button>
            </aside>
          </div>
        </div>
      </main>
  );
}
