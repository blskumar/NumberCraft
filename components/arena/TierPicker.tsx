import type { ReactNode } from 'react';
import { TIER_SPECS } from '@/lib/factor-grid-engine';
import type { AgeTier } from '@/lib/types';
import { TIER_ORDER } from './arena-shared';

/** Three age-tier cards; `detail` renders the last line of each card. */
export default function TierPicker({
  ageTier,
  onChangeTier,
  detail,
}: {
  ageTier: AgeTier;
  onChangeTier: (tier: AgeTier) => void;
  detail: (tier: AgeTier) => ReactNode;
}) {
  return (
    <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
      {TIER_ORDER.map((t) => {
        const spec = TIER_SPECS[t];
        const selected = ageTier === t;
        return (
          <button
            key={t}
            type="button"
            aria-pressed={selected}
            onClick={() => onChangeTier(t)}
            className={`rounded-xl border p-3 text-left transition-all ${
              selected
                ? 'border-[#1D4ED8] bg-[#EFF5FF] shadow-[0_2px_0_#C7DAFC]'
                : 'border-[#E0D9CA] bg-[#FAF8F4] hover:border-[#1D4ED8]/50'
            }`}
          >
            <p className="text-xs font-semibold text-[#1C232B]">{spec.label}</p>
            <p className="font-mono text-[11px] text-[#5A6572]">{spec.ageRange}</p>
            {detail(t)}
          </button>
        );
      })}
    </div>
  );
}
