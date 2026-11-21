'use client';

import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import FoundrySetup from './arena/FoundrySetup';
import FoundryPlay from './arena/FoundryPlay';
import FoundrySummary from './arena/FoundrySummary';
import { useEquationFoundryArena, type EquationFoundryArenaProps } from './arena/useEquationFoundryArena';

export default function EquationFoundryArena(props: EquationFoundryArenaProps) {
  const r = useEquationFoundryArena(props);
  const {
    activeTierSpec,
    onBackToStudio,
    onToggleSound,
    phase,
    soundEnabled,
  } = r;
  return (
    <main
      data-testid="equation-foundry-arena"
      className="mx-auto max-w-[1200px] px-4 py-7 sm:px-6 lg:px-8"
    >
      {/* Top Studio Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E0D5] pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToStudio}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#D8D0C0] bg-white px-3 py-2 text-xs font-semibold text-[#1C232B] hover:border-[#1D4ED8] hover:text-[#1D4ED8] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Games Studio
          </button>
          <div>
            <p className="font-mono text-[11px] font-semibold text-[#1D4ED8]">
              Set 01 Extension · Expression Building
            </p>
            <h1 className="font-display text-2xl font-semibold text-[#1C232B]">
              Equation Foundry
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-mono text-xs text-[#5A6572]">
            Tier:{' '}
            <strong className="font-semibold text-[#1C232B]">
              {activeTierSpec.label} ({activeTierSpec.ageRange})
            </strong>
          </span>
          <button
            type="button"
            onClick={onToggleSound}
            aria-pressed={soundEnabled}
            aria-label={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#D8D0C0] bg-white px-3 py-2 text-xs font-semibold text-[#1C232B] hover:border-[#1D4ED8] hover:text-[#1D4ED8] transition-colors"
          >
            {soundEnabled ? (
              <>
                <Volume2 className="h-3.5 w-3.5 text-[#047857]" aria-hidden="true" />
                Sound On
              </>
            ) : (
              <>
                <VolumeX className="h-3.5 w-3.5 text-[#5A6572]" aria-hidden="true" />
                Muted
              </>
            )}
          </button>
        </div>
      </div>

      {/* PHASE 1: SETUP */}
      {phase === 'setup' && (
        <FoundrySetup r={r} />
      )}

      {/* PHASE 2: ACTIVE GAMEPLAY */}
      {phase === 'playing' && (
        <FoundryPlay r={r} />
      )}

      {/* PHASE 3: FINISHED SUMMARY */}
      {phase === 'finished' && (
        <FoundrySummary r={r} />
      )}
    </main>
  );
}
