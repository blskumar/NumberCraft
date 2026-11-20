'use client';

import { motion } from 'motion/react';
import { Award, User } from 'lucide-react';
import type { StudentProfile } from '@/lib/types';

export type StudioTab =
  | 'studio'
  | 'daily'
  | 'dashboard'
  | 'play-factor-grid'
  | 'play-arithmetic'
  | 'rooms'
  | 'notebook'
  | 'blueprint';

interface TopNavProps {
  activeTab: StudioTab;
  onSelectTab: (tab: StudioTab) => void;
  profile: StudentProfile;
  earnedSealCount: number;
  onOpenAccount: () => void;
}

const NAV_ITEMS: { id: StudioTab; label: string; mobileLabel?: string }[] = [
  { id: 'studio', label: 'Games' },
  { id: 'daily', label: 'Daily' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'notebook', label: 'Notebook' },
  { id: 'rooms', label: 'Online Rooms', mobileLabel: 'Rooms' },
  { id: 'blueprint', label: 'Blueprint' },
];

export default function TopNav({
  activeTab,
  onSelectTab,
  profile,
  earnedSealCount,
  onOpenAccount,
}: TopNavProps) {
  const isGamesActive =
    activeTab === 'studio' ||
    activeTab === 'play-factor-grid' ||
    activeTab === 'play-arithmetic';

  const accountLabel =
    earnedSealCount > 0
      ? `${profile.displayName} · ${earnedSealCount} ${earnedSealCount === 1 ? 'Seal' : 'Seals'}`
      : profile.sessionKind === 'signed-in-preview'
        ? profile.displayName
        : `${profile.displayName} · Sign In`;

  return (
    <header className="sticky top-0 z-30 border-b border-[#E5E0D5] bg-[#FAF8F4]/95">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => onSelectTab('studio')}
          className="font-display text-xl font-semibold tracking-tight text-[#1C232B] hover:text-[#1D4ED8] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D4ED8]"
        >
          Numbercraft
        </button>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium"
        >
          {NAV_ITEMS.map((item) => {
            const active =
              item.id === 'studio' ? isGamesActive : activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`relative py-1 whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D4ED8] ${
                  active
                    ? 'text-[#1C232B] font-semibold'
                    : 'text-[#5A6572] hover:text-[#1C232B]'
                }`}
              >
                {item.label}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[21px] h-[2px] bg-[#1D4ED8]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Account Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            data-testid="topnav-profile-button"
            onClick={onOpenAccount}
            aria-label="Open student profile and mastery seals"
            className="inline-flex items-center gap-2 rounded-lg border border-[#D8D1C4] bg-white px-3.5 py-2 text-xs font-semibold text-[#1C232B] hover:border-[#1D4ED8] hover:text-[#1D4ED8] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
          >
            {earnedSealCount > 0 ? (
              <motion.span
                key={earnedSealCount}
                initial={{ scale: 0.7, rotate: -12 }}
                animate={{ scale: [0.7, 1.25, 0.95, 1], rotate: [0, 8, -4, 0] }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="inline-flex shrink-0"
              >
                <Award
                  className="h-3.5 w-3.5 shrink-0 text-[#B45309]"
                  aria-hidden="true"
                />
              </motion.span>
            ) : (
              <User className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            )}
            <span className="max-w-[180px] truncate">{accountLabel}</span>
          </button>
        </div>
      </div>

      {/* Compact mobile navigation row */}
      <nav
        aria-label="Mobile navigation"
        className="flex md:hidden items-center justify-between gap-1 overflow-x-auto border-t border-[#ECE7DD] bg-[#FAF8F4] px-2 py-1.5 text-xs font-medium"
      >
        {NAV_ITEMS.map((item) => {
          const active =
            item.id === 'studio' ? isGamesActive : activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`px-2 py-1.5 whitespace-nowrap shrink-0 transition-colors ${
                active
                  ? 'text-[#1D4ED8] font-semibold underline underline-offset-4'
                  : 'text-[#5A6572]'
              }`}
            >
              {item.mobileLabel ?? item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
