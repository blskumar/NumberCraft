'use client';

import { ARITHMETIC_GAMES, ARITHMETIC_GAME_ORDER } from '@/lib/arithmetic-engine';
import { ArrowLeft } from 'lucide-react';
import ArithmeticSetup from './arena/ArithmeticSetup';
import ArithmeticPlay from './arena/ArithmeticPlay';
import ArithmeticSummary from './arena/ArithmeticSummary';
import { useArithmeticArena, type ArithmeticArenaProps } from './arena/useArithmeticArena';

export default function ArithmeticArena(props: ArithmeticArenaProps) {
  const r = useArithmeticArena(props);
  const {
    activeSpec, finalizeRound, gameId, onBackToStudio, phase, problem, setGameId, setPhase,
    tierSpec,
  } = r;
  return (
    <main className="mx-auto max-w-[1160px] px-4 py-7 sm:px-6 lg:px-8">
      {/* Arena Header & Game Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5E0D5] pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToStudio}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8D1C4] bg-white px-3 py-1.5 text-xs font-semibold text-[#1C232B] hover:border-[#1D4ED8] hover:text-[#1D4ED8] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Games
          </button>
          <div>
            <p className="text-[11px] font-medium text-[#5A6572]">
              Set 01 · Core Arithmetic · {tierSpec.label} ({tierSpec.ageRange})
            </p>
            <h1 className="font-display text-2xl font-semibold text-[#1C232B]">
              {activeSpec.title}
            </h1>
          </div>
        </div>

        {/* Clean Segmented Switcher Across the 3 Arithmetic Games */}
        <div
          role="group"
          aria-label="Choose arithmetic game"
          className="flex min-w-0 max-w-full flex-wrap sm:flex-nowrap items-center gap-1 rounded-xl border border-[#DFD8CA] bg-[#EFECE3] p-1"
        >
          {ARITHMETIC_GAME_ORDER.map((id) => {
            const spec = ARITHMETIC_GAMES[id];
            const active = id === gameId;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  // Switching mid-round keeps the answered questions (same as Finish).
                  if (phase === 'playing') finalizeRound();
                  setGameId(id);
                  setPhase('setup');
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                  active
                    ? 'bg-white text-[#1C232B] shadow-[0_1px_3px_rgba(28,35,43,0.12)]'
                    : 'text-[#5A6572] hover:text-[#1C232B]'
                }`}
              >
                <span className="mr-1 font-mono">{spec.operatorSymbol}</span>
                {spec.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* PHASE 1: SETUP */}
      {phase === 'setup' && (
        <ArithmeticSetup r={r} />
      )}

      {/* PHASE 2: ACTIVE PLAY */}
      {phase === 'playing' && problem && (
        <ArithmeticPlay r={r} />
      )}

      {/* PHASE 3: ROUND SUMMARY */}
      {phase === 'summary' && (
        <ArithmeticSummary r={r} />
      )}
    </main>
  );
}
