import { PACE_ORDER, TIER_ORDER } from './arithmetic-constants';
import { ADAPTIVE_BANDS, type AdaptiveLevel } from '@/lib/adaptive-arithmetic';
import { ARITHMETIC_PACES, CORRECT_ANSWERS_PER_STAGE, TABLE_FOCUS_OPTIONS, type MultiplicationTableFocus } from '@/lib/arithmetic-engine';
import { TIER_SPECS } from '@/lib/factor-grid-engine';
import { Play, SlidersHorizontal, Volume2, VolumeX } from 'lucide-react';
import type { ArithmeticCtx } from './useArithmeticArena';

export default function ArithmeticSetup({ r }: { r: ArithmeticCtx }) {
  const {
    activeSpec,
    adaptiveDifficulty,
    ageTier,
    allowSignedStrategistSub,
    autoSubmit,
    calibration,
    gameId,
    multiplicationStages,
    onChangeTier,
    onToggleSound,
    pace,
    parTarget,
    playerName,
    setAdaptiveDifficulty,
    setAllowSignedStrategistSub,
    setAutoSubmit,
    setPace,
    setStartStage,
    setTableFocus,
    setUntimed,
    soundEnabled,
    startRound,
    startStage,
    tableFocus,
    tierSpec,
    untimed,
  } = r;
  return (
        <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="card-tactile rounded-2xl p-6 sm:p-7 lg:col-span-7">
            <p
              className="text-xs font-semibold"
              style={{ color: activeSpec.accentHex }}
            >
              {activeSpec.shortTag} · Adjustable Difficulty
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-[#1C232B]">
              Configure Your Session
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#46515E]">
              {activeSpec.description}
            </p>

            {/* Difficulty Level (Adaptive Age Tier) */}
            <div className="mt-6">
              <label className="block text-xs font-semibold text-[#1C232B]">
                1. Difficulty Level (Age Tier)
              </label>
              <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {TIER_ORDER.map((t) => {
                  const spec = TIER_SPECS[t];
                  const selected = ageTier === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onChangeTier(t)}
                      className={`rounded-xl border p-3 text-left transition-all ${
                        selected
                          ? 'border-[#1D4ED8] bg-[#EFF5FF] shadow-[0_2px_0_#C7DAFC]'
                          : 'border-[#E0D9CA] bg-[#FAF8F4] hover:border-[#1D4ED8]/50'
                      }`}
                    >
                      <p className="text-xs font-semibold text-[#1C232B]">
                        {spec.label}
                      </p>
                      <p className="font-mono text-[11px] text-[#5A6572]">
                        {spec.ageRange}
                      </p>
                      <p className="mt-1.5 text-[11px] leading-snug text-[#46515E]">
                        {activeSpec.tierSummaries[t]}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Timer / Pace Controls */}
            <div className="mt-6 border-t border-[#ECE7DD] pt-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-semibold text-[#1C232B]">
                  2. Round Timer &amp; Pace
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-[#46515E]">
                  <input
                    type="checkbox"
                    checked={untimed}
                    onChange={(e) => setUntimed(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-[#D8D1C4] accent-[#1D4ED8]"
                  />
                  Untimed Practice Mode
                </label>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {PACE_ORDER.map((p) => {
                  const spec = ARITHMETIC_PACES[p];
                  const selected = !untimed && pace === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      disabled={untimed}
                      aria-pressed={selected}
                      onClick={() => setPace(p)}
                      className={`rounded-xl border px-3 py-2.5 text-left transition-all ${
                        untimed
                          ? 'cursor-not-allowed border-[#ECE7DD] bg-[#F7F4ED] text-[#9AA3AD]'
                          : selected
                            ? 'border-[#1D4ED8] bg-[#EFF5FF] text-[#1C232B]'
                            : 'border-[#E0D9CA] bg-[#FAF8F4] text-[#46515E] hover:border-[#1D4ED8]/50'
                      }`}
                    >
                      <p className="font-mono text-xs font-semibold">
                        {spec.label}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#5A6572]">
                        {spec.note}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Adaptive Difficulty Engine Card */}
            <div className="mt-6 border-t border-[#ECE7DD] pt-5">
              <div className="rounded-xl border border-[#DFD8CA] bg-[#FAF8F4] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-2.5">
                    <SlidersHorizontal
                      className="mt-0.5 h-4 w-4 shrink-0 text-[#1D4ED8]"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#1C232B]">
                        Adaptive Difficulty Engine
                      </p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-[#5A6572]">
                        Adjusts operand complexity live from your recent history
                        and in-round streak—stepping up when you&apos;re in flow
                        and easing gently with hints if a problem trips you up.
                      </p>
                    </div>
                  </div>
                  <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 pt-0.5 text-xs font-semibold text-[#1C232B]">
                    <input
                      type="checkbox"
                      data-testid="adaptive-difficulty-toggle"
                      checked={adaptiveDifficulty}
                      onChange={(e) => setAdaptiveDifficulty(e.target.checked)}
                      className="h-4 w-4 rounded border-[#D8D1C4] accent-[#1D4ED8]"
                    />
                    {adaptiveDifficulty ? 'Active' : 'Off'}
                  </label>
                </div>

                {adaptiveDifficulty && (
                  <div className="mt-3.5 border-t border-[#E8E2D6] pt-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <span className="font-semibold text-[#1C232B]">
                        Calibrated Start:{' '}
                        <span
                          data-testid="adaptive-calibrated-start"
                          className="font-mono text-[#1D4ED8]"
                        >
                          {ADAPTIVE_BANDS[calibration.startingLevel].label}
                        </span>
                      </span>
                      <span className="font-mono text-[#5A6572] tabular-nums">
                        {calibration.recentRoundsAnalyzed > 0
                          ? `Based on ${calibration.recentRoundsAnalyzed} recent ${calibration.recentRoundsAnalyzed === 1 ? 'round' : 'rounds'}`
                          : 'New baseline'}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-5 gap-1.5">
                      {([1, 2, 3, 4, 5] as AdaptiveLevel[]).map((lvl) => (
                        <div
                          key={lvl}
                          className={`h-1.5 rounded-full transition-colors ${
                            lvl <= calibration.startingLevel
                              ? 'bg-[#1D4ED8]'
                              : 'bg-[#E3DDD0]'
                          }`}
                        />
                      ))}
                    </div>
                    <p
                      data-testid="adaptive-calibration-rationale"
                      className="mt-2 text-[11px] leading-snug text-[#46515E]"
                    >
                      {calibration.rationale}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Game-Specific Adjustable Options */}
            {gameId === 'multiplication-mastery' && (
              <div className="mt-6 border-t border-[#ECE7DD] pt-5 space-y-4">
                <div>
                  <label
                    htmlFor="table-focus-select"
                    className="block text-xs font-semibold text-[#1C232B]"
                  >
                    3. Multiplication Table Progression
                  </label>
                  <select
                    id="table-focus-select"
                    value={tableFocus}
                    onChange={(e) =>
                      setTableFocus(e.target.value as MultiplicationTableFocus)
                    }
                    className="mt-1.5 w-full rounded-lg border border-[#D8D1C4] bg-white px-3 py-2 text-xs font-medium text-[#1C232B] focus:border-[#1D4ED8] focus:outline-none"
                  >
                    {TABLE_FOCUS_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label} — {opt.description}
                      </option>
                    ))}
                  </select>
                </div>

                {tableFocus === 'progressive' &&
                  (adaptiveDifficulty ? (
                    <p className="rounded-lg border border-[#E8DEC8] bg-[#FDF9EF] px-3 py-2 text-[11px] text-[#6B4209]">
                      Adaptive Difficulty will begin at{' '}
                      <strong className="font-mono">
                        Stage {calibration.startingLevel}
                      </strong>{' '}
                      and automatically climb or ease across all 5 table stages
                      based on your accuracy and pace. Uncheck Adaptive
                      Difficulty above to choose a fixed starting stage.
                    </p>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold text-[#1C232B]">
                        Starting Stage (levels up every{' '}
                        {CORRECT_ANSWERS_PER_STAGE} correct answers)
                      </p>
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-5">
                        {multiplicationStages.map((st) => {
                          const selected = startStage === st.stage;
                          return (
                            <button
                              key={st.stage}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => setStartStage(st.stage)}
                              className={`rounded-lg border p-2 text-left transition-all ${
                                selected
                                  ? 'border-[#B45309] bg-[#FDF6E7] text-[#1C232B]'
                                  : 'border-[#E0D9CA] bg-[#FAF8F4] text-[#5A6572] hover:border-[#B45309]/50'
                              }`}
                            >
                              <p className="font-mono text-[11px] font-semibold text-[#B45309]">
                                Stage {st.stage}
                              </p>
                              <p className="mt-0.5 text-[11px] font-semibold text-[#1C232B] leading-tight">
                                {st.name}
                              </p>
                              <p className="mt-0.5 font-mono text-[10px] text-[#5A6572]">
                                {st.rangeLabel}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {gameId === 'subtraction-sprint' && ageTier === 'strategists' && (
              <div className="mt-5 border-t border-[#ECE7DD] pt-4">
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-[#1C232B]">
                  <input
                    type="checkbox"
                    checked={allowSignedStrategistSub}
                    onChange={(e) =>
                      setAllowSignedStrategistSub(e.target.checked)
                    }
                    className="h-3.5 w-3.5 rounded border-[#D8D1C4] accent-[#047857]"
                  />
                  Include signed negative differences (e.g., 42 − 67 = −25)
                </label>
              </div>
            )}

            <div className="mt-5 border-t border-[#ECE7DD] pt-4">
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-[#46515E]">
                <input
                  type="checkbox"
                  checked={autoSubmit}
                  onChange={(e) => setAutoSubmit(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-[#D8D1C4] accent-[#1D4ED8]"
                />
                Fast Mode: auto-submit immediately when digits match the answer
              </label>
            </div>
          </div>

          {/* Right Launch Summary Card */}
          <div className="card-tactile flex flex-col justify-between rounded-2xl p-6 sm:p-7 lg:col-span-5">
            <div>
              <p className="text-xs font-medium text-[#5A6572]">
                Ready on Desk · {playerName}
              </p>
              <h3 className="mt-1 font-display text-xl font-semibold text-[#1C232B]">
                Session Blueprint
              </h3>

              <dl className="mt-5 space-y-3 border-y border-[#ECE7DD] py-4 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-[#5A6572]">Game Mode</dt>
                  <dd className="font-semibold text-[#1C232B]">
                    {activeSpec.title}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-[#5A6572]">Difficulty Tier</dt>
                  <dd className="font-semibold text-[#1C232B]">
                    {tierSpec.label} ({tierSpec.ageRange})
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-[#5A6572]">Clock</dt>
                  <dd className="font-mono font-semibold text-[#1C232B] tabular-nums">
                    {untimed ? 'Untimed Practice' : ARITHMETIC_PACES[pace].label}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-[#5A6572]">Complexity Engine</dt>
                  <dd className="font-mono font-semibold text-[#1D4ED8] tabular-nums">
                    {adaptiveDifficulty
                      ? `Adaptive · ${ADAPTIVE_BANDS[calibration.startingLevel].shortLabel}`
                      : 'Fixed Tier Pace'}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-[#5A6572]">Mastery Par Target</dt>
                  <dd className="font-mono font-semibold text-[#047857] tabular-nums">
                    {parTarget} pts
                  </dd>
                </div>
              </dl>

              <div className="mt-5 rounded-xl border border-[#E5E0D5] bg-[#FAF8F4] p-4 text-xs leading-relaxed text-[#46515E]">
                <p className="font-semibold text-[#1C232B]">
                  Controls &amp; Mental Math Support
                </p>
                <p className="mt-1">
                  Type directly on your keyboard (<span className="font-mono">0–9</span>,{' '}
                  <span className="font-mono">Enter</span>) or tap the tactile
                  ceramic keypad. Press <span className="font-mono">H</span> at
                  any time for a step-by-step mental math decomposition hint.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-2.5">
              <button
                type="button"
                data-testid="start-arithmetic-btn"
                onClick={() => startRound()}
                className="btn-cobalt flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold"
              >
                <Play className="h-4 w-4" aria-hidden="true" />
                Start {activeSpec.title}
              </button>
              <button
                type="button"
                data-testid="arithmetic-setup-sound-toggle"
                aria-pressed={soundEnabled}
                onClick={onToggleSound}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#D8D1C4] bg-[#FAF8F4] px-4 py-2 text-xs font-semibold text-[#5A6572] hover:border-[#1D4ED8] hover:text-[#1C232B]"
              >
                {soundEnabled ? (
                  <>
                    <Volume2 className="h-3.5 w-3.5 text-[#1D4ED8]" aria-hidden="true" />
                    Audio Feedback On (Global)
                  </>
                ) : (
                  <>
                    <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
                    Audio Feedback Muted (Global)
                  </>
                )}
              </button>
            </div>
          </div>
        </section>
  );
}
