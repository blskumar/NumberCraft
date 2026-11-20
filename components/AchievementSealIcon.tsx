'use client';

import {
  Award,
  CalendarCheck,
  Compass,
  Crown,
  Flame,
  GraduationCap,
  Hash,
  Layers,
  Scale,
  Sparkles,
  Sun,
  Zap,
} from 'lucide-react';
import type { AchievementAccent, AchievementId } from '@/lib/types';

interface AchievementSealIconProps {
  id: AchievementId;
  accent: AchievementAccent;
  earned: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const ACCENT_STYLES: Record<
  AchievementAccent,
  {
    outer: string;
    inner: string;
    icon: string;
  }
> = {
  cobalt: {
    outer:
      'border-[#1D4ED8]/45 bg-[#EFF5FF] shadow-[0_2px_0_rgba(29,78,216,0.16)]',
    inner: 'border-[#1D4ED8]/30 bg-white',
    icon: 'text-[#1D4ED8]',
  },
  emerald: {
    outer:
      'border-[#047857]/45 bg-[#ECFDF5] shadow-[0_2px_0_rgba(4,120,87,0.16)]',
    inner: 'border-[#047857]/30 bg-white',
    icon: 'text-[#047857]',
  },
  ochre: {
    outer:
      'border-[#B45309]/45 bg-[#FFFBEB] shadow-[0_2px_0_rgba(180,83,9,0.18)]',
    inner: 'border-[#B45309]/30 bg-white',
    icon: 'text-[#B45309]',
  },
};

const SIZE_STYLES = {
  sm: {
    outer: 'h-9 w-9 rounded-lg p-1',
    inner: 'rounded-md',
    icon: 'h-3.5 w-3.5',
  },
  md: {
    outer: 'h-11 w-11 rounded-xl p-1',
    inner: 'rounded-lg',
    icon: 'h-4 w-4',
  },
  lg: {
    outer: 'h-12 w-12 rounded-xl p-1',
    inner: 'rounded-lg',
    icon: 'h-5 w-5',
  },
};

function SealGlyph({
  id,
  className,
}: {
  id: AchievementId;
  className: string;
}) {
  switch (id) {
    case 'first-victory':
      return <Award className={className} aria-hidden="true" />;
    case 'perfect-streak':
      return <Flame className={className} aria-hidden="true" />;
    case 'top-scorer':
      return <Crown className={className} aria-hidden="true" />;
    case 'prime-collector':
      return <Hash className={className} aria-hidden="true" />;
    case 'scholar-rival':
      return <GraduationCap className={className} aria-hidden="true" />;
    case 'master-strategist':
      return <Compass className={className} aria-hidden="true" />;
    case 'taxman-victor':
      return <Scale className={className} aria-hidden="true" />;
    case 'tier-explorer':
      return <Layers className={className} aria-hidden="true" />;
    case 'daily-pioneer':
      return <Sun className={className} aria-hidden="true" />;
    case 'daily-lightning':
      return <Zap className={className} aria-hidden="true" />;
    case 'daily-flawless':
      return <Sparkles className={className} aria-hidden="true" />;
    case 'daily-streak-3':
      return <CalendarCheck className={className} aria-hidden="true" />;
  }
}

export default function AchievementSealIcon({
  id,
  accent,
  earned,
  size = 'md',
}: AchievementSealIconProps) {
  const s = SIZE_STYLES[size];

  if (!earned) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center border border-dashed border-[#D3CBB9] bg-[#F5F2EA] ${s.outer}`}
      >
        <span
          className={`flex h-full w-full items-center justify-center border border-[#E5DFD3] bg-[#FAF8F4] ${s.inner}`}
        >
          <SealGlyph id={id} className={`${s.icon} text-[#A59D8E]`} />
        </span>
      </span>
    );
  }

  const palette = ACCENT_STYLES[accent];
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center border ${palette.outer} ${s.outer}`}
    >
      <span
        className={`flex h-full w-full items-center justify-center border ${palette.inner} ${s.inner}`}
      >
        <SealGlyph id={id} className={`${s.icon} ${palette.icon}`} />
      </span>
    </span>
  );
}
