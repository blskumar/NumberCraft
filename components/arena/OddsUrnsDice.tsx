import { DICE_PIP_COORDS } from './odds-urns-constants';
import { type MarbleKind, type SpinnerWheelState } from '@/lib/odds-urns-engine';
import { motion } from 'motion/react';

export function MapleDie({ value, hazard }: { value: number; hazard: boolean }) {
  const pips = DICE_PIP_COORDS[value] ?? DICE_PIP_COORDS[1];
  return (
    <svg
      viewBox="0 0 100 100"
      className="h-20 w-20 sm:h-24 sm:w-24 drop-shadow-[0_4px_6px_rgba(28,35,43,0.14)]"
      role="img"
      aria-label={`Die showing ${value}`}
    >
      <rect
        x="6"
        y="6"
        width="88"
        height="88"
        rx="18"
        fill={hazard ? '#FFF1F2' : '#FFFDF8'}
        stroke={hazard ? '#BE123C' : '#C9BCA6'}
        strokeWidth="3.5"
      />
      {pips.map(([cx, cy], idx) => (
        <circle
          key={idx}
          cx={cx}
          cy={cy}
          r="8.5"
          fill={hazard ? '#BE123C' : '#1C232B'}
        />
      ))}
    </svg>
  );
}

export function ConditionalSpinnerSvg({
  wheel,
  rotationDeg,
  reducedMotion,
}: {
  wheel: SpinnerWheelState;
  rotationDeg: number;
  reducedMotion: boolean | null;
}) {
  const total = wheel.cobaltCount + wheel.emeraldCount + wheel.hazardCount;
  const sectors: { kind: MarbleKind; index: number }[] = [];
  for (let i = 0; i < wheel.cobaltCount; i++) {
    sectors.push({ kind: 'cobalt', index: sectors.length });
  }
  for (let i = 0; i < wheel.emeraldCount; i++) {
    sectors.push({ kind: 'emerald', index: sectors.length });
  }
  for (let i = 0; i < wheel.hazardCount; i++) {
    sectors.push({ kind: 'hazard', index: sectors.length });
  }

  const fillMap: Record<MarbleKind, string> = {
    cobalt: '#1D4ED8',
    emerald: '#047857',
    hazard: '#BE123C',
  };

  return (
    <div className="relative mx-auto flex h-52 w-52 items-center justify-center sm:h-56 sm:w-56">
      {/* Top brass pointer */}
      <div
        aria-hidden="true"
        className="absolute -top-1.5 left-1/2 z-10 h-0 w-0 -translate-x-1/2 border-x-[9px] border-t-[15px] border-x-transparent border-t-[#1C232B]"
      />
      <motion.svg
        viewBox="0 0 200 200"
        animate={{ rotate: rotationDeg }}
        transition={
          reducedMotion
            ? { duration: 0.05 }
            : { duration: 0.55, ease: [0.22, 1, 0.36, 1] }
        }
        className="h-full w-full drop-shadow-[0_6px_12px_rgba(28,35,43,0.14)]"
        role="img"
        aria-label={`Conditional spinner wheel with ${wheel.cobaltCount} cobalt, ${wheel.emeraldCount} emerald, and ${wheel.hazardCount} crimson hazard sectors`}
      >
        {sectors.map((sec, i) => {
          const startAngle = (i * 360) / total - 90;
          const endAngle = ((i + 1) * 360) / total - 90;
          const startRad = (startAngle * Math.PI) / 180;
          const endRad = (endAngle * Math.PI) / 180;
          const x1 = 100 + 92 * Math.cos(startRad);
          const y1 = 100 + 92 * Math.sin(startRad);
          const x2 = 100 + 92 * Math.cos(endRad);
          const y2 = 100 + 92 * Math.sin(endRad);
          const largeArc = endAngle - startAngle > 180 ? 1 : 0;
          const d = `M 100 100 L ${x1.toFixed(2)} ${y1.toFixed(2)} A 92 92 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
          return (
            <path
              key={i}
              d={d}
              fill={fillMap[sec.kind]}
              stroke="#FAF8F4"
              strokeWidth="2"
            />
          );
        })}
        <circle
          cx="100"
          cy="100"
          r="20"
          fill="#FAF8F4"
          stroke="#1C232B"
          strokeWidth="3"
        />
        <circle cx="100" cy="100" r="6" fill="#B45309" />
      </motion.svg>
    </div>
  );
}
