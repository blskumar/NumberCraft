import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Sparkles } from 'lucide-react';
import AchievementSealIcon from '@/components/AchievementSealIcon';
import type { AccountCtx } from './useAccount';

/** Mastery Seals strip: pin an earned seal as the profile's featured seal. */
export default function SealsStrip({ c }: { c: AccountCtx }) {
  const {
    achievementEvaluation, activeFeatured, newlyUnlockedDefs, recentlyUnlockedSet,
    handlePinSeal, onClose, onOpenNotebook,
  } = c;
  return (
    <section
      aria-label="Profile mastery seals"
      data-testid="profile-seals-strip"
      className="mt-4 rounded-xl border border-[#E5E0D5] bg-[#FAF8F4] p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-[#1C232B]">
            Mastery Seals ·{' '}
            <span className="font-mono tabular-nums text-[#1D4ED8]">
              {achievementEvaluation.earnedCount} /{' '}
              {achievementEvaluation.totalCount}
            </span>
          </p>
          <p className="mt-0.5 text-[11px] text-[#5A6572]">
            {activeFeatured
              ? `Featured Seal: ${activeFeatured.title} (${activeFeatured.criteriaNote})`
              : achievementEvaluation.earnedCount > 0
                ? 'Click any unlocked medallion to pin it to your profile.'
                : 'Win Factor Grid matches to stamp your first archival seal.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenNotebook();
          }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#1D4ED8] hover:text-[#1E40AF] whitespace-nowrap shrink-0"
        >
          Notebook
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <AnimatePresence>
        {newlyUnlockedDefs.length > 0 && (
          <motion.div
            data-testid="account-new-badge-banner"
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{
              type: 'spring',
              stiffness: 380,
              damping: 26,
            }}
            className="mt-3 flex items-center gap-2 rounded-lg border border-[#DFC99B] bg-[#FFFBEB] px-3 py-2 text-[11px] font-semibold text-[#92400E]"
          >
            <Sparkles
              className="h-3.5 w-3.5 shrink-0 text-[#B45309]"
              aria-hidden="true"
            />
            <span>
              Newly Unlocked:{' '}
              {newlyUnlockedDefs.map((d) => d.title).join(', ')}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-3.5 grid grid-cols-4 gap-2 sm:grid-cols-6">
        {achievementEvaluation.statuses.map((status, idx) => {
          const { definition, earned } = status;
          const isPinned = activeFeatured?.id === definition.id;
          const isNewlyUnlocked =
            earned && recentlyUnlockedSet.has(definition.id);

          return (
            <motion.button
              key={definition.id}
              type="button"
              data-testid={`account-badge-${definition.id}`}
              data-newly-unlocked={isNewlyUnlocked ? 'true' : 'false'}
              disabled={!earned}
              onClick={() => handlePinSeal(definition.id)}
              initial={
                isNewlyUnlocked
                  ? { opacity: 0, scale: 0.55, y: 8 }
                  : { opacity: 0, scale: 0.9, y: 4 }
              }
              animate={
                isNewlyUnlocked
                  ? {
                      opacity: 1,
                      scale: [0.55, 1.18, 0.94, 1.06, 1],
                      rotate: [0, -7, 6, -3, 0],
                      y: 0,
                    }
                  : { opacity: 1, scale: 1, y: 0 }
              }
              transition={
                isNewlyUnlocked
                  ? {
                      duration: 0.68,
                      delay: 0.06 + idx * 0.025,
                      ease: [0.22, 1, 0.36, 1],
                    }
                  : {
                      type: 'spring',
                      stiffness: 340,
                      damping: 26,
                      delay: idx * 0.02,
                    }
              }
              whileHover={earned ? { scale: 1.09, y: -2 } : undefined}
              whileTap={earned ? { scale: 0.93 } : undefined}
              title={
                earned
                  ? `${definition.title} — Click to ${isPinned ? 'unpin' : 'pin'} as Featured Seal`
                  : `${definition.title} (Locked · ${status.progressLabel})`
              }
              aria-label={
                earned
                  ? `${definition.title} (Earned${isPinned ? ', Featured' : ''}${isNewlyUnlocked ? ', Newly Unlocked' : ''})`
                  : `${definition.title} (Locked, ${status.progressLabel})`
              }
              className={`relative flex flex-col items-center justify-center rounded-lg p-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] ${
                isPinned
                  ? 'bg-[#EFF5FF]'
                  : earned
                    ? 'hover:bg-white cursor-pointer'
                    : 'cursor-default opacity-80'
              }`}
            >
              {isPinned && (
                <motion.span
                  layoutId="account-featured-seal-ring"
                  aria-hidden="true"
                  transition={{
                    type: 'spring',
                    stiffness: 420,
                    damping: 30,
                  }}
                  className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-[#1D4ED8]"
                />
              )}

              {isNewlyUnlocked && (
                <>
                  <motion.span
                    aria-hidden="true"
                    initial={{ scale: 0.75, opacity: 0.75 }}
                    animate={{ scale: 1.45, opacity: 0 }}
                    transition={{
                      duration: 0.85,
                      delay: 0.14 + idx * 0.025,
                      ease: 'easeOut',
                    }}
                    className="pointer-events-none absolute inset-1 rounded-full border-2 border-[#B45309]"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute right-1 top-1 h-2 w-2 rounded-full bg-[#B45309] ring-2 ring-[#FAF8F4]"
                  />
                </>
              )}

              <AchievementSealIcon
                id={definition.id}
                accent={definition.accent}
                earned={earned}
                size="sm"
              />
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
