'use client';


import FactorGridSetup from './arena/FactorGridSetup';
import FactorGridToolbar from './arena/FactorGridToolbar';
import FactorGridBoardZone from './arena/FactorGridBoardZone';
import FactorGridGameOver from './arena/FactorGridGameOver';
import { useFactorGrid, type FactorGridPrototypeProps } from './arena/useFactorGrid';

export default function FactorGridPrototype(props: FactorGridPrototypeProps) {
  const r = useFactorGrid(props);
  const {
    game,
    stage,
  } = r;
  if (stage === 'setup') return <FactorGridSetup r={r} />;

  return (
    <main className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 lg:px-8">
      {/* Compact Game Toolbar */}
      <FactorGridToolbar r={r} />

      {/* Compact Mobile Score Strip (visible only below lg breakpoint) */}
      <div className="card-tactile mt-4 flex items-center justify-between rounded-xl px-4 py-2.5 text-xs font-mono tabular-nums lg:hidden">
        <span className="font-semibold text-[#1D4ED8]">
          {game.player1Name}: {game.scores.p1}
        </span>
        <span aria-hidden="true" className="text-[#D8D1C4]">
          vs
        </span>
        <span className="font-semibold text-[#8A5108]">
          {game.player2Name}: {game.scores.p2}
        </span>
      </div>

      {/* Two-Zone Sandbox Layout (65% Board Left, 35% HUD & Math Deck Right) */}
      <FactorGridBoardZone r={r} />

      {/* End-of-Game Summary Modal */}
      {game.status === 'gameover' && (
        <FactorGridGameOver r={r} />
      )}
    </main>
  );
}
