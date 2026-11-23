import { Fragment, type ReactNode } from 'react';
import { Trophy } from 'lucide-react';

interface ScoreTile {
  label: ReactNode;
  value: ReactNode;
  color: string;
}

export function AiSummaryHeader({
  title,
  heading,
  scores,
}: {
  title: ReactNode;
  heading: ReactNode;
  scores: ScoreTile[];
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#ECE7DD] pb-5">
      <div>
        <p className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[#047857]">
          <Trophy className="h-4 w-4" aria-hidden="true" />
          {title}
        </p>
        <h2 className="mt-1.5 font-display text-3xl font-semibold text-[#1C232B]">
          {heading}
        </h2>
      </div>

      <div className="flex items-center gap-5 rounded-xl border border-[#E5E0D5] bg-[#FAF8F4] px-5 py-3 font-mono tabular-nums">
        {scores.map((s, i) => (
          <Fragment key={i}>
            {i > 0 && <div className="h-8 w-px bg-[#DFD8CA]" aria-hidden="true" />}
            <div>
              <p className="text-[11px] text-[#5A6572]">{s.label}</p>
              <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

export function SealUnlockedNotice({ badges }: { badges: { title: string }[] }) {
  if (badges.length === 0) return null;
  return (
    <div className="mt-5 rounded-xl border border-[#DFC99B] bg-[#FFFDF7] p-4">
      <p className="text-xs font-semibold text-[#B45309]">
        New Mastery Seal Unlocked!
      </p>
      <p className="mt-1 text-sm text-[#1C232B]">
        {badges.map((b) => b.title).join(', ')}
      </p>
    </div>
  );
}
