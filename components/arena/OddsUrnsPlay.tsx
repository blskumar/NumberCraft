import { ConditionalSpinnerSvg, MapleDie } from './OddsUrnsDice';
import { DICE_SUM_WAYS, MARBLE_GRADIENTS, TOTAL_ROUNDS } from './odds-urns-constants';
import { AlertTriangle, Check, Dices, Eye, EyeOff, Landmark, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import type { OddsUrnsCtx } from './useOddsUrnsArena';

export default function OddsUrnsPlay({ r }: { r: OddsUrnsCtx }) {
  const {
    ageTier,
    botScore,
    chamber,
    chamberSpec,
    currentPot,
    drawnMarbles,
    estimateFeedback,
    estimateSlider,
    handleLockEstimate,
    handlePlayerBank,
    handlePlayerPress,
    lastDice,
    lastOutcome,
    mode,
    odds,
    playerName,
    playerScore,
    prefersReducedMotion,
    roundNumber,
    setEstimateSlider,
    setShowEvCoach,
    showEvCoach,
    spinnerRotation,
    spinnerWheel,
    turnLog,
    turnOwner,
    urnMarbles,
  } = r;
  return (
        <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: Interactive Chamber Stage */}
          <div className="space-y-5 lg:col-span-7">
            {/* Score & Turn Banner */}
            <div className="card-tactile flex flex-wrap items-center justify-between gap-4 rounded-2xl px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#DFD8CA] bg-[#FAF8F4] font-mono text-sm font-semibold text-[#1C232B] tabular-nums">
                  R{roundNumber}/{TOTAL_ROUNDS}
                </div>
                <div>
                  <p className="font-mono text-[11px] font-semibold text-[#1D4ED8]">
                    {turnOwner === 'player'
                      ? `${playerName}’s Turn`
                      : 'EV Bot Calculating…'}
                  </p>
                  <p className="text-sm font-semibold text-[#1C232B]">
                    {chamberSpec.title}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-5 font-mono tabular-nums">
                <div className="text-right">
                  <p className="text-[11px] text-[#5A6572]">{playerName}</p>
                  <p className="text-lg font-semibold text-[#1D4ED8]">
                    {playerScore} pts
                  </p>
                </div>
                <div className="h-7 w-px bg-[#E5E0D5]" aria-hidden="true" />
                <div className="text-right">
                  <p className="text-[11px] text-[#5A6572]">
                    {mode === 'solo' ? 'EV Par' : 'EV Bot'}
                  </p>
                  <p className="text-lg font-semibold text-[#1C232B]">
                    {mode === 'solo' ? TOTAL_ROUNDS * 32 : botScore} pts
                  </p>
                </div>
              </div>
            </div>

            {/* Tactile Chamber Surface */}
            <div className="card-tactile rounded-2xl p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ECE7DD] pb-4">
                <div>
                  <p className="font-mono text-[11px] text-[#5A6572]">
                    Unbanked Turn Pot
                  </p>
                  <p
                    data-testid="odds-current-pot"
                    className="font-mono text-3xl font-semibold text-[#B45309] tabular-nums"
                  >
                    {currentPot} pts
                  </p>
                </div>

                <div className="text-right font-mono tabular-nums">
                  <p className="text-[11px] text-[#5A6572]">
                    Exact Safe Probability
                  </p>
                  <p className="text-lg font-semibold text-[#047857]">
                    {odds.safeNumerator}/{odds.denominator}{' '}
                    <span className="text-xs font-normal text-[#5A6572]">
                      ({odds.reducedFraction} · {odds.safePercent}%)
                    </span>
                  </p>
                </div>
              </div>

              {/* Chamber Visual */}
              <div className="mt-5 rounded-xl border border-[#E5E0D5] bg-[#FAF8F4] p-5">
                {chamber === 'marble-urn' && (
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#5A6572]">
                      <span className="font-semibold text-[#1C232B]">
                        Remaining in Glass Urn ({urnMarbles.length} marbles)
                      </span>
                      <span className="font-mono">
                        {ageTier === 'explorers'
                          ? 'With Replacement'
                          : 'Without Replacement'}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-center gap-3 py-2">
                      {urnMarbles.map((m) => (
                        <motion.div
                          key={m.id}
                          layout={!prefersReducedMotion}
                          className="flex flex-col items-center gap-1"
                        >
                          <span
                            aria-label={m.label}
                            className="h-10 w-10 rounded-full shadow-[inset_0_2px_4px_rgba(255,255,255,0.5),0_4px_8px_rgba(28,35,43,0.18)]"
                            style={{ background: MARBLE_GRADIENTS[m.kind] }}
                          />
                          <span className="font-mono text-[10px] font-semibold text-[#5A6572]">
                            {m.kind === 'hazard' ? 'HAZ' : `+${m.points}`}
                          </span>
                        </motion.div>
                      ))}
                    </div>

                    {drawnMarbles.length > 0 && (
                      <div className="mt-4 border-t border-[#E5E0D5] pt-3">
                        <p className="font-mono text-[11px] text-[#5A6572]">
                          Drawn Tray This Turn:
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {drawnMarbles.map((m, idx) => (
                            <span
                              key={`${m.id}-${idx}`}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2DCCF] bg-white px-2.5 py-1 font-mono text-[11px] font-semibold text-[#1C232B]"
                            >
                              <span
                                className="h-3 w-3 rounded-full"
                                style={{ background: MARBLE_GRADIENTS[m.kind] }}
                              />
                              {m.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {chamber === 'twin-dice' && (
                  <div>
                    <div className="flex items-center justify-center gap-5 py-2">
                      <MapleDie
                        value={lastDice[0]}
                        hazard={lastOutcome?.safe === false}
                      />
                      <span className="font-mono text-2xl font-semibold text-[#5A6572]">
                        +
                      </span>
                      <MapleDie
                        value={lastDice[1]}
                        hazard={lastOutcome?.safe === false}
                      />
                    </div>
                    <p className="mt-2 text-center font-mono text-xs text-[#5A6572]">
                      Last Roll Sum:{' '}
                      <strong className="text-[#1C232B]">
                        {lastDice[0] + lastDice[1]}
                      </strong>{' '}
                      · Hazard: Sum 7
                      {ageTier === 'strategists' ? ' or 1+1' : ''}
                    </p>

                    {/* 36-Outcome Distribution Bar Strip */}
                    <div className="mt-4 grid grid-cols-11 gap-1 pt-2">
                      {DICE_SUM_WAYS.map((bar) => {
                        const isHaz =
                          bar.sum === 7 ||
                          (ageTier === 'strategists' && bar.sum === 2);
                        const isOuter = bar.sum <= 4 || bar.sum >= 10;
                        return (
                          <div
                            key={bar.sum}
                            className="flex flex-col items-center gap-1"
                          >
                            <div className="flex h-14 w-full items-end justify-center">
                              <div
                                className={`w-full rounded-t ${
                                  isHaz
                                    ? 'bg-[#BE123C]'
                                    : isOuter
                                      ? 'bg-[#047857]'
                                      : 'bg-[#1D4ED8]'
                                }`}
                                style={{ height: `${(bar.ways / 6) * 100}%` }}
                              />
                            </div>
                            <span className="font-mono text-[10px] font-semibold text-[#1C232B] tabular-nums">
                              {bar.sum}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {chamber === 'conditional-spinner' && (
                  <div>
                    <ConditionalSpinnerSvg
                      wheel={spinnerWheel}
                      rotationDeg={spinnerRotation}
                      reducedMotion={prefersReducedMotion}
                    />
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-4 font-mono text-xs">
                      <span className="text-[#1D4ED8] font-semibold">
                        Cobalt (+14): {spinnerWheel.cobaltCount}/12
                      </span>
                      <span className="text-[#047857] font-semibold">
                        Emerald Boost (+22): {spinnerWheel.emeraldCount}/12
                      </span>
                      <span className="text-[#BE123C] font-semibold">
                        Hazard: {spinnerWheel.hazardCount}/12
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Latest Draw Feedback */}
              {lastOutcome && (
                <div
                  aria-live="polite"
                  className={`mt-4 flex items-start gap-2.5 rounded-xl border p-3.5 text-xs ${
                    lastOutcome.safe
                      ? 'border-[#047857]/35 bg-[#ECFDF5] text-[#065F46]'
                      : 'border-[#BE123C]/35 bg-[#FFF1F2] text-[#9F1239]'
                  }`}
                >
                  {lastOutcome.safe ? (
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  )}
                  <div>
                    <p className="font-semibold">{lastOutcome.headline}</p>
                    <p className="mt-0.5 opacity-90">{lastOutcome.detail}</p>
                  </div>
                </div>
              )}

              {/* Primary Turn Actions */}
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  data-testid="odds-press-btn"
                  disabled={turnOwner !== 'player'}
                  onClick={handlePlayerPress}
                  className="btn-cobalt flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-45"
                >
                  <Dices className="h-4 w-4" aria-hidden="true" />
                  {chamber === 'marble-urn'
                    ? 'Draw Marble (Press)'
                    : chamber === 'twin-dice'
                      ? 'Roll Twin Dice (Press)'
                      : 'Spin Wheel (Press)'}
                </button>

                <button
                  type="button"
                  data-testid="odds-bank-btn"
                  disabled={turnOwner !== 'player' || currentPot <= 0}
                  onClick={handlePlayerBank}
                  className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[#047857]/45 bg-[#ECFDF5] px-5 py-3 text-sm font-semibold text-[#047857] shadow-[0_2px_0_#A7F3D0] hover:bg-[#D1FAE5] disabled:opacity-40 transition-colors"
                >
                  <Landmark className="h-4 w-4" aria-hidden="true" />
                  Bank {currentPot} pts
                </button>
              </div>
            </div>
          </div>

          {/* Right: Calibration, EV Coach & Bot Reasoning Log */}
          <aside className="space-y-5 lg:col-span-5">
            {/* Probability Calibration Slider */}
            <div className="card-tactile rounded-2xl p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-[#1C232B]">
                  Estimate Safe Odds (+10 Calibration Bonus)
                </p>
                <span className="font-mono text-sm font-semibold text-[#1D4ED8] tabular-nums">
                  {estimateSlider}%
                </span>
              </div>
              <p className="mt-1 text-xs text-[#5A6572]">
                Lock your percentage estimate within ±6% of the exact safe odds
                once per turn for +10 bonus points.
              </p>

              <input
                type="range"
                min={0}
                max={100}
                step={1}
                aria-label="Estimate safe draw percentage"
                disabled={turnOwner !== 'player' || Boolean(estimateFeedback?.locked)}
                value={estimateSlider}
                onChange={(e) => setEstimateSlider(Number(e.target.value))}
                className="mt-3 w-full accent-[#1D4ED8]"
              />

              <div className="mt-3 flex items-center justify-between gap-2">
                {estimateFeedback?.locked ? (
                  <p
                    className={`text-xs font-semibold ${
                      estimateFeedback.accurate
                        ? 'text-[#047857]'
                        : 'text-[#B45309]'
                    }`}
                  >
                    {estimateFeedback.accurate
                      ? `Spot-on! Exact ${estimateFeedback.actual}% (+10 pts)`
                      : `Exact was ${estimateFeedback.actual}% (off by ${estimateFeedback.errorMargin}%)`}
                  </p>
                ) : (
                  <span className="font-mono text-[11px] text-[#5A6572]">
                    0% (Certain Hazard) → 100% (Certain Safe)
                  </span>
                )}

                <button
                  type="button"
                  data-testid="odds-estimate-lock-btn"
                  disabled={turnOwner !== 'player' || Boolean(estimateFeedback?.locked)}
                  onClick={handleLockEstimate}
                  className="inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-lg border border-[#1D4ED8] bg-[#EFF5FF] px-3 py-1.5 text-xs font-semibold text-[#1D4ED8] hover:bg-[#DBEAFE] disabled:opacity-45 transition-colors"
                >
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  Lock Estimate
                </button>
              </div>
            </div>

            {/* Live EV Coach */}
            <div className="card-tactile rounded-2xl p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-[#1C232B]">
                  Live Expected Value Coach
                </p>
                <button
                  type="button"
                  onClick={() => setShowEvCoach((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#5A6572] hover:text-[#1D4ED8]"
                >
                  {showEvCoach ? (
                    <>
                      <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                      Hide
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      Show
                    </>
                  )}
                </button>
              </div>

              {showEvCoach ? (
                <div className="mt-3 space-y-2.5">
                  <div className="grid grid-cols-3 gap-2 font-mono text-xs tabular-nums">
                    <div className="rounded-lg border border-[#ECE7DD] bg-[#FAF8F4] p-2.5">
                      <p className="text-[10px] text-[#5A6572]">Safe Odds</p>
                      <p className="mt-0.5 font-semibold text-[#047857]">
                        {odds.safePercent}%
                      </p>
                    </div>
                    <div className="rounded-lg border border-[#ECE7DD] bg-[#FAF8F4] p-2.5">
                      <p className="text-[10px] text-[#5A6572]">Hazard</p>
                      <p className="mt-0.5 font-semibold text-[#BE123C]">
                        {odds.hazardPercent}%
                      </p>
                    </div>
                    <div className="rounded-lg border border-[#ECE7DD] bg-[#FAF8F4] p-2.5">
                      <p className="text-[10px] text-[#5A6572]">E[Press]</p>
                      <p
                        className={`mt-0.5 font-semibold ${
                          odds.expectedValueDelta >= 0
                            ? 'text-[#1D4ED8]'
                            : 'text-[#B45309]'
                        }`}
                      >
                        {odds.expectedValueDelta >= 0 ? '+' : ''}
                        {odds.expectedValueDelta.toFixed(1)}
                      </p>
                    </div>
                  </div>
                  <p className="rounded-lg border border-[#E5E0D5] bg-[#FAF8F4] px-3 py-2 font-mono text-[11px] text-[#334155]">
                    {odds.formulaExplanation}
                  </p>
                  <p className="text-xs text-[#46515E]">
                    EV Guidance:{' '}
                    <strong className="font-semibold text-[#1C232B]">
                      {odds.recommendation === 'press'
                        ? 'Positive expected value — pressing is favorable.'
                        : 'Negative expected value — banking protects your lead.'}
                    </strong>
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-xs text-[#5A6572]">
                  EV Coach hidden for independent mental probability practice.
                </p>
              )}
            </div>

            {/* Explainable EV Bot & Chamber Log */}
            <div className="card-tactile rounded-2xl p-5">
              <p className="text-xs font-semibold text-[#1C232B]">
                Turn &amp; EV Bot Reasoning Log
              </p>
              <ul
                data-testid="odds-turn-log"
                className="mt-3 max-h-[210px] space-y-2 overflow-y-auto pr-1"
              >
                {turnLog.map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-lg border border-[#ECE7DD] bg-[#FAF8F4] px-3 py-2 text-xs"
                  >
                    <span
                      className={`font-semibold ${
                        entry.tone === 'hazard'
                          ? 'text-[#BE123C]'
                          : entry.tone === 'bot'
                            ? 'text-[#1D4ED8]'
                            : entry.tone === 'bank'
                              ? 'text-[#B45309]'
                              : 'text-[#047857]'
                      }`}
                    >
                      {entry.actor}:
                    </span>{' '}
                    <span className="text-[#46515E]">{entry.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </section>
  );
}
