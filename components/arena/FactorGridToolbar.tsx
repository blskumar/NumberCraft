import { PRIME_TRAP_BONUS } from '@/lib/factor-grid-engine';
import { ArrowLeft, Lightbulb, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import type { FactorGridCtx } from './useFactorGrid';

export default function FactorGridToolbar({ r }: { r: FactorGridCtx }) {
  const {
    aiThinking, game, handleRequestHint, onToggleSound, setStage, soundEnabled,
    spec, startNewMatch,
  } = r;
  return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2DCCF] pb-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setStage('setup')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#5A6572] hover:text-[#1C232B] transition-colors whitespace-nowrap"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Mode Setup
          </button>
          <span aria-hidden="true" className="text-[#D8D1C4]">
            /
          </span>
          <div className="flex flex-wrap items-baseline gap-2">
            <h1 className="font-display text-xl font-semibold text-[#1C232B]">
              Factor Grid
            </h1>
            <span className="text-xs text-[#5A6572] font-mono tabular-nums">
              1–{game.boardMax} · {spec.label} ·{' '}
              {game.variant === 'prime-trap'
                ? `Prime Trap (+${PRIME_TRAP_BONUS})`
                : 'Classic'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRequestHint}
            disabled={game.status !== 'playing' || aiThinking}
            title="Show optimal hint (H)"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8D0C0] bg-white px-3 py-2 text-xs font-semibold text-[#1C232B] shadow-[0_2px_0_#E5DEC9] hover:border-[#047857] hover:text-[#047857] disabled:opacity-45 transition-all whitespace-nowrap"
          >
            <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
            Hint
          </button>

          <button
            type="button"
            onClick={onToggleSound}
            aria-label={soundEnabled ? 'Mute game sounds' : 'Unmute game sounds'}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8D0C0] bg-white px-3 py-2 text-xs font-semibold text-[#1C232B] shadow-[0_2px_0_#E5DEC9] hover:border-[#1D4ED8] transition-all whitespace-nowrap"
          >
            {soundEnabled ? (
              <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">
              {soundEnabled ? 'Sound On' : 'Muted'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => startNewMatch()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8D0C0] bg-white px-3 py-2 text-xs font-semibold text-[#1C232B] shadow-[0_2px_0_#E5DEC9] hover:border-[#1D4ED8] transition-all whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Restart
          </button>
        </div>
      </div>
  );
}
