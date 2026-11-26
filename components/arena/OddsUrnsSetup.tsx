import { TIER_ORDER } from './arena-shared';
import type { ProbabilityChamber } from '@/lib/odds-urns-engine';
import type { AiDifficulty } from '@/lib/types';
import { TIER_SPECS } from '@/lib/factor-grid-engine';
import { CHAMBER_SPECS } from '@/lib/odds-urns-engine';
import { ArrowRight, Bot, Compass, Dices, Sparkles, User } from 'lucide-react';
import type { OddsUrnsCtx } from './useOddsUrnsArena';

const CHAMBER_ORDER: ProbabilityChamber[] = [
  'marble-urn',
  'twin-dice',
  'conditional-spinner',
];
const DIFFICULTIES: { id: AiDifficulty; label: string; desc: string }[] = [
  { id: 'apprentice', label: 'Apprentice', desc: 'Banks conservatively early' },
  { id: 'scholar', label: 'Scholar', desc: 'Balanced expected value play' },
  { id: 'master', label: 'Master', desc: 'Exact optimal EV ≥ 0 cutoff' },
];

export default function OddsUrnsSetup({ r }: { r: OddsUrnsCtx }) {
  const {
    ageTier, aiDifficulty, chamber, chamberSpec, mode, onChangeTier,
    setAiDifficulty, setChamber, setMode, startSession,
  } = r;
  return (
        <section className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="card-tactile rounded-2xl p-6 sm:p-8 lg:col-span-8">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#047857]">
              <Dices className="h-4 w-4" aria-hidden="true" />
              <span>5-Round Probability &amp; Expected Value Match</span>
            </div>
            <h2 className="mt-2 font-display text-2xl font-semibold text-[#1C232B] sm:text-3xl">
              Read live odds, estimate fractions, and know when to bank.
            </h2>
            <p className="mt-2.5 max-w-[60ch] text-sm leading-relaxed text-[#46515E]">
              Choose one of three tactile probability chambers. Every turn, you
              can lock an optional Safe-Odds estimate for a +10 pt calibration
              bonus, then press for higher rewards or bank before a hazard hits.
            </p>

            {/* Chamber Picker */}
            <div className="mt-6">
              <p className="text-xs font-semibold text-[#1C232B]">
                1. Select Probability Chamber
              </p>
              <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {CHAMBER_ORDER.map((cid) => {
                  const spec = CHAMBER_SPECS[cid];
                  const selected = chamber === cid;
                  const Icon =
                    cid === 'marble-urn'
                      ? Sparkles
                      : cid === 'twin-dice'
                        ? Dices
                        : Compass;
                  return (
                    <button
                      key={cid}
                      type="button"
                      data-testid={`odds-chamber-${cid}`}
                      aria-pressed={selected}
                      onClick={() => setChamber(cid)}
                      className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all ${
                        selected
                          ? 'border-[#1D4ED8] bg-[#EFF5FF] shadow-[0_2px_0_#BFDBFE]'
                          : 'border-[#E2DCCF] bg-[#FAF8F4] hover:border-[#1D4ED8]/50'
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 ${
                          selected ? 'text-[#1D4ED8]' : 'text-[#5A6572]'
                        }`}
                        aria-hidden="true"
                      />
                      <span className="mt-2 text-sm font-semibold text-[#1C232B]">
                        {spec.title}
                      </span>
                      <span className="mt-0.5 text-xs text-[#5A6572]">
                        {spec.subtitle}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tier Selector */}
            <div className="mt-6">
              <p className="text-xs font-semibold text-[#1C232B]">
                2. Adaptive Age Tier
              </p>
              <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {TIER_ORDER.map((t) => {
                  const spec = TIER_SPECS[t];
                  const selected = ageTier === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onChangeTier(t)}
                      className={`rounded-xl border px-3.5 py-3 text-left transition-all ${
                        selected
                          ? 'border-[#1D4ED8] bg-[#EFF5FF] text-[#1C232B]'
                          : 'border-[#E2DCCF] bg-white text-[#46515E] hover:border-[#1D4ED8]/50'
                      }`}
                    >
                      <p className="text-sm font-semibold text-[#1C232B]">
                        {spec.label} · {spec.ageRange}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#5A6572]">
                        {t === 'explorers'
                          ? 'With replacement · gentle hazards'
                          : t === 'challengers'
                            ? 'Without replacement · live shifts'
                            : 'Full EV analysis · tighter margins'}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mode & EV Bot Difficulty */}
            <div className="mt-6">
              <p className="text-xs font-semibold text-[#1C232B]">
                3. Opponent Mode
              </p>
              <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  aria-pressed={mode === 'vs-ai'}
                  onClick={() => setMode('vs-ai')}
                  className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all ${
                    mode === 'vs-ai'
                      ? 'border-[#1D4ED8] bg-[#EFF5FF]'
                      : 'border-[#E2DCCF] bg-white hover:border-[#1D4ED8]/50'
                  }`}
                >
                  <Bot className="mt-0.5 h-5 w-5 shrink-0 text-[#1D4ED8]" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-[#1C232B]">
                      vs. Explainable EV Bot
                    </p>
                    <p className="mt-0.5 text-xs text-[#46515E]">
                      Watch the Bot explain every Press/Bank choice in plain
                      English using expected value.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  aria-pressed={mode === 'solo'}
                  onClick={() => setMode('solo')}
                  className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all ${
                    mode === 'solo'
                      ? 'border-[#1D4ED8] bg-[#EFF5FF]'
                      : 'border-[#E2DCCF] bg-white hover:border-[#1D4ED8]/50'
                  }`}
                >
                  <User className="mt-0.5 h-5 w-5 shrink-0 text-[#047857]" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-[#1C232B]">
                      Solo Probability Lab
                    </p>
                    <p className="mt-0.5 text-xs text-[#46515E]">
                      Explore 5 rounds against EV Par (160 pts) with zero
                      turn pressure.
                    </p>
                  </div>
                </button>
              </div>

              {mode === 'vs-ai' && (
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      aria-pressed={aiDifficulty === d.id}
                      onClick={() => setAiDifficulty(d.id)}
                      className={`rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
                        aiDifficulty === d.id
                          ? 'border-[#1D4ED8] bg-white text-[#1C232B] shadow-[0_2px_0_#D8D0C0]'
                          : 'border-[#E5E0D5] bg-[#FAF8F4] text-[#5A6572]'
                      }`}
                    >
                      <p className="text-xs font-semibold text-[#1C232B]">
                        {d.label}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#5A6572]">
                        {d.desc}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                data-testid="start-odds-btn"
                onClick={() => startSession(ageTier)}
                className="btn-cobalt inline-flex min-h-[46px] items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold"
              >
                Open {chamberSpec.title}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="font-mono text-xs text-[#5A6572]">
                5 rounds · Live fractions + E[Press] coach
              </span>
            </div>
          </div>

          <aside className="card-tactile flex flex-col justify-between rounded-2xl bg-[#FFFDF9] p-6 lg:col-span-4">
            <div>
              <p className="font-mono text-xs font-semibold text-[#047857]">
                Active Chamber Briefing
              </p>
              <h3 className="mt-1.5 font-display text-xl font-semibold text-[#1C232B]">
                {chamberSpec.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#46515E]">
                {chamberSpec.ruleSummary}
              </p>
            </div>

            <div className="mt-6 rounded-xl border border-[#E5E0D5] bg-[#FAF8F4] p-4">
              <p className="font-mono text-[11px] font-semibold text-[#1D4ED8]">
                Expected Value Formula
              </p>
              <p className="mt-1 font-mono text-xs text-[#1C232B]">
                E[Press] = P(Safe) × AvgGain − P(Hazard) × Pot
              </p>
              <p className="mt-1.5 text-xs text-[#5A6572]">
                When E[Press] drops below 0, banking protects your expected
                score over the long run.
              </p>
            </div>
          </aside>
        </section>
  );
}
