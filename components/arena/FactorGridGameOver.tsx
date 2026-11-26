import AchievementSealIcon from '@/components/AchievementSealIcon';
import { ShieldAlert, Sparkles, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import type { FactorGridCtx } from './useFactorGrid';

export default function FactorGridGameOver({ r }: { r: FactorGridCtx }) {
  const {
    biggestSwing, game, guestTrialLocked, newlyUnlockedSeals, onBackToStudio,
    onOpenNotebook, onRequireRegistration, setStage, startNewMatch,
  } = r;
  return (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="gameover-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C232B]/45 p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="card-tactile w-full max-w-md rounded-2xl p-6 shadow-2xl"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-[#047857]">
              {game.winner === 'p1' ? (
                <>
                  <Trophy className="h-4 w-4" aria-hidden="true" />
                  <span>Victory · Match Recorded in Notebook</span>
                </>
              ) : game.winner === 'draw' ? (
                <>
                  <Sparkles className="h-4 w-4 text-[#B45309]" aria-hidden="true" />
                  <span className="text-[#B45309]">Exact Draw · Match Recorded</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="h-4 w-4 text-[#BE123C]" aria-hidden="true" />
                  <span className="text-[#BE123C]">
                    {game.player2Name} Won · Match Recorded
                  </span>
                </>
              )}
            </div>

            <h2
              id="gameover-title"
              className="mt-2 font-display text-2xl font-semibold text-[#1C232B]"
            >
              {game.winner === 'p1'
                ? `${game.player1Name} conquered the grid!`
                : game.winner === 'draw'
                  ? 'Dead heat on the Factor Grid!'
                  : `${game.player2Name} claimed the higher total.`}
            </h2>

            <p className="mt-2 text-sm text-[#46515E]">{game.lastInsight}</p>

            <div className="mt-5 grid grid-cols-3 gap-2.5 border-y border-[#ECE7DD] py-4 text-center font-mono tabular-nums">
              <div>
                <p className="font-sans text-[11px] text-[#5A6572]">
                  {game.player1Name}
                </p>
                <p className="mt-1 text-2xl font-semibold text-[#1D4ED8]">
                  {game.scores.p1}
                </p>
              </div>
              <div>
                <p className="font-sans text-[11px] text-[#5A6572]">
                  {game.player2Name}
                </p>
                <p className="mt-1 text-2xl font-semibold text-[#8A5108]">
                  {game.scores.p2}
                </p>
              </div>
              <div>
                <p className="font-sans text-[11px] text-[#5A6572]">
                  Best Swing
                </p>
                <p className="mt-1 text-2xl font-semibold text-[#047857]">
                  +{biggestSwing}
                </p>
              </div>
            </div>

            {newlyUnlockedSeals.length > 0 && (
              <div
                data-testid="gameover-unlocked-seals"
                className="mt-4 rounded-xl border border-[#DFD8CA] bg-[#FAF8F4] p-3.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold text-[#B45309]">
                    {newlyUnlockedSeals.length === 1
                      ? 'New Mastery Seal Unlocked'
                      : `${newlyUnlockedSeals.length} New Mastery Seals Unlocked`}
                  </p>
                  <button
                    type="button"
                    onClick={onOpenNotebook}
                    className="text-[11px] font-semibold text-[#1D4ED8] hover:text-[#1E40AF] underline underline-offset-2 whitespace-nowrap"
                  >
                    View in Notebook
                  </button>
                </div>
                <div className="mt-2.5 space-y-2">
                  {newlyUnlockedSeals.map((seal) => (
                    <div
                      key={seal.id}
                      className="flex items-center gap-3 text-left"
                    >
                      <AchievementSealIcon
                        id={seal.id}
                        accent={seal.accent}
                        earned
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="font-display text-sm font-semibold text-[#1C232B]">
                          {seal.title}
                        </p>
                        <p className="truncate text-[11px] text-[#5A6572]">
                          {seal.criteriaNote}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {guestTrialLocked && (
              <div
                data-testid="arena-guest-trial-notice"
                className="mt-4 rounded-xl border border-[#1D4ED8]/35 bg-[#EFF5FF] px-3.5 py-2.5 text-xs text-[#1C232B]"
              >
                <strong>Free Guest Trial Complete:</strong> Register for free
                with any email (no payment required) to unlock unlimited Factor
                Grid matches and save scores.
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-2.5">
              {guestTrialLocked ? (
                <button
                  type="button"
                  data-testid="arena-guest-register-btn"
                  onClick={() => onRequireRegistration?.()}
                  className="btn-cobalt flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold whitespace-nowrap"
                >
                  Register Free to Continue
                </button>
              ) : (
                <button
                  type="button"
                  data-start="true"
                  onClick={() => startNewMatch()}
                  className="btn-cobalt flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold whitespace-nowrap"
                >
                  Play Again
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  guestTrialLocked ? onBackToStudio() : setStage('setup')
                }
                className="rounded-xl border border-[#D8D0C0] bg-[#FAF8F4] px-4 py-2.5 text-sm font-semibold text-[#1C232B] hover:border-[#1D4ED8] transition-colors whitespace-nowrap"
              >
                {guestTrialLocked ? 'Back to Studio' : 'Change Mode'}
              </button>
            </div>
          </motion.div>
        </div>
  );
}
