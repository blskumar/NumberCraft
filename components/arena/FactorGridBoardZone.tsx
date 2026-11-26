import { isPrime } from '@/lib/factor-grid-engine';
import { Bot, CheckCircle2, Lightbulb, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import type { FactorGridCtx } from './useFactorGrid';

export default function FactorGridBoardZone({ r }: { r: FactorGridCtx }) {
  const {
    activeActorName, activePreview, aiThinking, freshTilesSet, game,
    gridColsClass, handleTileClick, highlightedDivisors, hintNote, hintTile,
    hoveredTile, inspectedNumber, legalMovesSet, p1SharePercent,
    remainingLegalCount, scoreDiff, setHintNote, setHintTile, setHoveredTile,
    tilesArray,
  } = r;
  return (
      <div className="mt-4 lg:mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        {/* LEFT ZONE: Tactile Ceramic Drafting Grid */}
        <section
          aria-label="Factor Grid interactive board"
          className="card-tactile rounded-2xl p-4 sm:p-6 lg:col-span-8"
        >
          {/* Live Preview & Turn Bar. Reserved height: the preview wraps to 2-3 lines on narrow boards; a variable height made the grid jump under the pointer. */}
          <div className="mb-5 flex min-h-[122px] sm:min-h-[116px] md:min-h-[100px] xl:min-h-[68px] flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E5E0D5] bg-[#FAF8F4] px-4 py-2.5 text-sm">
            {activePreview ? (
              activePreview.legal ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs sm:text-sm tabular-nums">
                  <span className="font-semibold text-[#1D4ED8]">
                    Claim {activePreview.tile} (+{activePreview.claimPoints})
                  </span>
                  <span aria-hidden="true" className="text-[#9CA3AF]">
                    ·
                  </span>
                  <span className="font-medium text-[#B45309]">
                    {game.player2Name} gets{' '}
                    {'{' + activePreview.opponentDivisors.join(', ') + '}'} (+
                    {activePreview.opponentPoints})
                  </span>
                  <span aria-hidden="true" className="text-[#9CA3AF]">
                    ·
                  </span>
                  <span
                    className={`font-semibold ${
                      activePreview.netSwing >= 0
                        ? 'text-[#047857]'
                        : 'text-[#BE123C]'
                    }`}
                  >
                    Net {activePreview.netSwing >= 0 ? '+' : ''}
                    {activePreview.netSwing}
                  </span>
                </div>
              ) : (
                <span className="text-xs font-medium text-[#5A6572]">
                  {game.tiles[activePreview.tile] !== 'unclaimed'
                    ? `Tile ${activePreview.tile} is already claimed.`
                    : `Tile ${activePreview.tile} is locked — none of its proper divisors remain open.`}
                </span>
              )
            ) : (
              <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-[#1C232B]">
                {game.status === 'gameover' ? (
                  <>
                    <Trophy
                      className="h-4 w-4 text-[#047857]"
                      aria-hidden="true"
                    />
                    <span>Match complete — review your board summary.</span>
                  </>
                ) : aiThinking ? (
                  <motion.div
                    initial={{ opacity: 0.6 }}
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 0.9, repeat: Infinity }}
                    className="flex items-center gap-2 text-[#8A5108]"
                  >
                    <Bot className="h-4 w-4" aria-hidden="true" />
                    <span>{game.player2Name} is evaluating divisor trades…</span>
                  </motion.div>
                ) : (
                  <>
                    <CheckCircle2
                      className="h-4 w-4 text-[#1D4ED8]"
                      aria-hidden="true"
                    />
                    <span>
                      <strong>{activeActorName}&apos;s turn</strong> — select an
                      open tile ({remainingLegalCount} legal{' '}
                      {remainingLegalCount === 1 ? 'move' : 'moves'}).
                    </span>
                  </>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 text-[11px] font-medium text-[#5A6572]">
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="inline-block h-2.5 w-2.5 rounded-xs bg-[#1D4ED8]"
                />
                {game.player1Name}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="inline-block h-2.5 w-2.5 rounded-xs border border-[#C6A26A] bg-[#EFE3CE]"
                />
                {game.player2Name}
              </span>
            </div>
          </div>

          {/* Hint Banner */}
          {hintNote && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.16 }}
              className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-[#047857]/35 bg-[#ECFDF5] px-4 py-2.5 text-xs text-[#065F46]"
            >
              <div className="flex items-start gap-2">
                <Lightbulb
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#047857]"
                  aria-hidden="true"
                />
                <span>{hintNote}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setHintTile(null);
                  setHintNote(null);
                }}
                className="font-semibold underline shrink-0"
              >
                Dismiss
              </button>
            </motion.div>
          )}

          {/* Tactile Ceramic Numbered Grid */}
          <div
            data-testid="factor-grid-board"
            className={`grid gap-2.5 sm:gap-3 ${gridColsClass}`}
          >
            {tilesArray.map((n) => {
              const owner = game.tiles[n];
              const legal = legalMovesSet.has(n);
              const isHovered = hoveredTile === n;
              const isDivisorHighlight = highlightedDivisors.has(n);
              const isHint = hintTile === n && legal;
              const isFresh = freshTilesSet.has(n);
              const primeFlag = isPrime(n);

              // min-h is important: the global `button { min-height: 24px }` floor (unlayered) beats
              // utilities, which collapsed tiles to 30px so the 12px 'divisor'/'hint' label grew the row.
              let tileClass =
                'relative flex min-h-[54px]! sm:min-h-[64px]! flex-col items-center justify-center rounded-xl border font-mono text-base sm:text-lg font-semibold tabular-nums transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]';

              if (owner === 'p1') {
                tileClass +=
                  ' border-[#1539A3] bg-[#1D4ED8] text-white shadow-[inset_0_2px_5px_rgba(0,0,0,0.2)] cursor-default';
              } else if (owner === 'p2') {
                tileClass +=
                  ' border-[#C9AA79] bg-[#EFE3CE] text-[#6B4208] shadow-[inset_0_2px_4px_rgba(107,66,8,0.12)] cursor-default';
              } else if (isDivisorHighlight) {
                tileClass +=
                  ' border-[#D97706] bg-[#FEF3C7] text-[#92400E] shadow-[0_3px_0_#D97706] -translate-y-0.5';
              } else if (isHint) {
                tileClass +=
                  ' border-[#047857] bg-[#ECFDF5] text-[#065F46] shadow-[0_3px_0_#047857] hover:-translate-y-0.5 cursor-pointer';
              } else if (legal && !aiThinking) {
                tileClass += isHovered
                  ? ' border-[#1D4ED8] bg-[#EFF6FF] text-[#1D4ED8] shadow-[0_4px_0_#1D4ED8] -translate-y-0.5 cursor-pointer'
                  : ' border-[#D8D0C0] bg-white text-[#1C232B] shadow-[0_3px_0_#DDD5C5] hover:border-[#1D4ED8] hover:bg-[#EFF6FF] hover:text-[#1D4ED8] hover:shadow-[0_4px_0_#1D4ED8] hover:-translate-y-0.5 active:translate-y-[1px] active:shadow-[0_1px_0_#1D4ED8] cursor-pointer';
              } else {
                tileClass +=
                  ' border-dashed border-[#DDD6C7] bg-[#F5F1E8] text-[#9AA3AD] cursor-not-allowed';
              }

              const ownerLabel =
                owner === 'p1'
                  ? `Claimed by ${game.player1Name}`
                  : owner === 'p2'
                    ? `Claimed by ${game.player2Name}`
                    : legal
                      ? 'Playable'
                      : 'Locked';

              return (
                <motion.button
                  key={n}
                  type="button"
                  disabled={!legal || aiThinking || game.status !== 'playing'}
                  aria-label={`Tile ${n}, ${primeFlag ? 'prime, ' : ''}${ownerLabel}`}
                  animate={isFresh ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  onMouseEnter={() => setHoveredTile(n)}
                  onMouseLeave={() =>
                    setHoveredTile((prev) => (prev === n ? null : prev))
                  }
                  onFocus={() => setHoveredTile(n)}
                  onBlur={() =>
                    setHoveredTile((prev) => (prev === n ? null : prev))
                  }
                  onClick={() => handleTileClick(n)}
                  className={tileClass}
                >
                  {primeFlag && (
                    <span
                      aria-hidden="true"
                      className={`absolute top-1.5 right-2 font-sans text-[10px] font-bold leading-none ${
                        owner === 'p1'
                          ? 'text-white/80'
                          : owner === 'p2'
                            ? 'text-[#92400E]/75'
                            : 'text-[#047857]'
                      }`}
                    >
                      p
                    </span>
                  )}

                  <span>{n}</span>

                  {isDivisorHighlight && (
                    <span className="mt-0.5 font-sans text-[10px] font-semibold leading-none text-[#92400E]">
                      divisor
                    </span>
                  )}
                  {isHint && !isDivisorHighlight && (
                    <span className="mt-0.5 font-sans text-[10px] font-semibold leading-none text-[#047857]">
                      hint
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>

          <p className="mt-4 text-xs text-[#5A6572]">
            Tiles marked with <span className="font-semibold text-[#047857]">p</span>{' '}
            are prime numbers. Dashed tiles have no unclaimed proper divisors
            remaining. Press <span className="font-mono font-semibold text-[#1C232B]">H</span> for a hint.
          </p>
        </section>

        {/* RIGHT ZONE: Scoreboard HUD, Territory Balance, Math Insight & Move Ledger */}
        <aside className="space-y-5 lg:col-span-4">
          {/* Scoreboard Card */}
          <div className="card-tactile rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-[#5A6572]">
                Live Scoreboard
              </h2>
              <span className="font-mono text-[11px] font-semibold tabular-nums text-[#5A6572]">
                {scoreDiff > 0
                  ? `${game.player1Name} +${scoreDiff}`
                  : scoreDiff < 0
                    ? `${game.player2Name} +${Math.abs(scoreDiff)}`
                    : 'Level'}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div
                className={`rounded-xl border p-3.5 transition-colors ${
                  game.status === 'playing' && game.currentTurn === 'p1'
                    ? 'border-[#1D4ED8] bg-[#EFF6FF]'
                    : 'border-[#ECE7DD] bg-[#FAF8F4]'
                }`}
              >
                <p className="truncate text-xs font-semibold text-[#1C232B]">
                  {game.player1Name}
                </p>
                <p
                  data-testid="score-p1"
                  className="mt-1 font-mono text-3xl font-semibold text-[#1D4ED8] tabular-nums"
                >
                  {game.scores.p1}
                </p>
                <p className="mt-1 text-[11px] text-[#5A6572] font-mono tabular-nums">
                  Primes: {game.primesClaimed.p1}
                </p>
              </div>

              <div
                className={`rounded-xl border p-3.5 transition-colors ${
                  game.status === 'playing' && game.currentTurn === 'p2'
                    ? 'border-[#D97706] bg-[#FEF3C7]/60'
                    : 'border-[#ECE7DD] bg-[#FAF8F4]'
                }`}
              >
                <p className="truncate text-xs font-semibold text-[#1C232B]">
                  {game.player2Name}
                </p>
                <p
                  data-testid="score-p2"
                  className="mt-1 font-mono text-3xl font-semibold text-[#8A5108] tabular-nums"
                >
                  {game.scores.p2}
                </p>
                <p className="mt-1 text-[11px] text-[#5A6572] font-mono tabular-nums">
                  Primes: {game.primesClaimed.p2}
                </p>
              </div>
            </div>

            {/* Territory Balance Bar */}
            <div className="mt-3.5" aria-label="Score share balance">
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#EFE3CE]">
                <div
                  className="h-full bg-[#1D4ED8] transition-all duration-300"
                  style={{ width: `${p1SharePercent}%` }}
                />
              </div>
              <div className="mt-1.5 flex justify-between font-mono text-[10px] text-[#5A6572] tabular-nums">
                <span>{p1SharePercent}% share</span>
                <span>{100 - p1SharePercent}% share</span>
              </div>
            </div>

            {/* Latest Move / AI Reasoning Strip */}
            <div className="mt-4 border-t border-[#ECE7DD] pt-3.5">
              <p className="text-[11px] font-semibold text-[#5A6572]">
                Latest Play Note
              </p>
              <p
                data-testid="latest-insight"
                className="mt-1 text-xs leading-relaxed text-[#1C232B]"
              >
                {game.lastInsight}
              </p>
            </div>
          </div>

          {/* Live Number Theory Inspector */}
          <div className="card-tactile rounded-2xl p-5">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-xs font-semibold text-[#5A6572]">
                Number Inspector
              </h2>
              <span className="font-mono text-xs font-semibold text-[#1C232B] tabular-nums">
                n = {inspectedNumber.value} ·{' '}
                {inspectedNumber.kind.charAt(0).toUpperCase() +
                  inspectedNumber.kind.slice(1)}
              </span>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-[#46515E]">
              {inspectedNumber.summary}
            </p>

            {inspectedNumber.properDivisors.length > 0 && (
              <p className="mt-2.5 font-mono text-xs text-[#5A6572] tabular-nums">
                Proper divisors: {'{' + inspectedNumber.properDivisors.join(', ') + '}'}{' '}
                (sum = {inspectedNumber.divisorSum})
              </p>
            )}
          </div>

          {/* Algebraic Move Ledger */}
          <div className="card-tactile rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-[#5A6572]">
                Move Ledger
              </h2>
              <span className="font-mono text-xs text-[#5A6572] tabular-nums">
                {game.moves.length} {game.moves.length === 1 ? 'turn' : 'turns'}
              </span>
            </div>

            {game.moves.length === 0 ? (
              <p className="mt-3 text-xs text-[#5A6572]">
                No tiles claimed yet. Try hovering a high prime number first!
              </p>
            ) : (
              <ol className="mt-3 max-h-[210px] space-y-2 overflow-y-auto pr-1 text-xs">
                {[...game.moves].reverse().map((m) => (
                  <li
                    key={m.turnNumber}
                    className="flex items-center justify-between gap-2 border-b border-[#F1EDE4] pb-2 last:border-b-0 last:pb-0 font-mono tabular-nums"
                  >
                    <span className="truncate font-sans text-[#1C232B]">
                      <span className="font-mono text-[#5A6572]">
                        #{m.turnNumber}
                      </span>{' '}
                      <strong>{m.actorName}</strong> took{' '}
                      <span className="font-mono font-semibold">
                        {m.claimedTile}
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] text-[#5A6572]">
                      +{m.claimPoints} / −{m.surrenderedPoints}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </aside>
      </div>
  );
}
