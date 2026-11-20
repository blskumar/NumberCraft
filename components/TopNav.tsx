'use client';

import { motion } from 'motion/react';
import { Award, Monitor, Moon, Sun, User } from 'lucide-react';
import Tooltip from '@/components/Tooltip';
import { cycleThemePreference, getThemeLabel } from '@/lib/theme';
import type { StudentProfile, ThemePreference } from '@/lib/types';

export type StudioTab =
  | 'studio'
  | 'daily'
  | 'dashboard'
  | 'play-factor-grid'
  | 'play-arithmetic'
  | 'play-equation-foundry'
  | 'play-odds-urns'
  | 'rooms'
  | 'notebook'
  | 'rules';

interface TopNavProps {
  activeTab: StudioTab;
  onSelectTab: (tab: StudioTab) => void;
  profile: StudentProfile;
  earnedSealCount: number;
  themePreference: ThemePreference;
  onChangeTheme: (next: ThemePreference) => void;
  onOpenAccount: () => void;
}

const NAV_ITEMS: {
  id: StudioTab;
  label: string;
  mobileLabel?: string;
  tooltip: string;
}[] = [
  {
    id: 'studio',
    label: 'Games',
    tooltip: 'Browse Arithmetic, Equation Foundry, Odds & Urns, and Factor Grid',
  },
  {
    id: 'daily',
    label: 'Daily',
    tooltip: 'Solve today’s timed 3-clue Daily Math Challenge to grow your streak',
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    tooltip: 'Track arithmetic accuracy trends and challenge completion charts',
  },
  {
    id: 'notebook',
    label: 'Notebook',
    tooltip: 'Inspect earned Mastery Seals, strategy notes, and match history',
  },
  {
    id: 'rooms',
    label: 'Online Rooms',
    mobileLabel: 'Rooms',
    tooltip: 'Host or join 6-character child-safe multiplayer math rooms',
  },
  {
    id: 'rules',
    label: 'Rules',
    tooltip: 'Read step-by-step rules and playable variations for every game',
  },
];

export default function TopNav({
  activeTab,
  onSelectTab,
  profile,
  earnedSealCount,
  themePreference,
  onChangeTheme,
  onOpenAccount,
}: TopNavProps) {
  const isGamesActive =
    activeTab === 'studio' ||
    activeTab === 'play-factor-grid' ||
    activeTab === 'play-arithmetic' ||
    activeTab === 'play-equation-foundry' ||
    activeTab === 'play-odds-urns';

  const accountLabel =
    earnedSealCount > 0
      ? `${profile.displayName} · ${earnedSealCount} ${earnedSealCount === 1 ? 'Seal' : 'Seals'}`
      : profile.sessionKind === 'authenticated'
        ? profile.displayName
        : 'Sign In / Register';

  const ThemeIcon =
    themePreference === 'dark'
      ? Moon
      : themePreference === 'light'
        ? Sun
        : Monitor;
  const nextTheme = cycleThemePreference(themePreference);

  return (
    <header className="sticky top-0 z-30 border-b border-[#E5E0D5] bg-[#FAF8F4]/95">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-2 sm:gap-4 px-4 sm:px-6 lg:px-8">
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
          className="hidden lg:flex items-center gap-6 text-sm font-medium"
        >
          {NAV_ITEMS.map((item) => {
            const active =
              item.id === 'studio' ? isGamesActive : activeTab === item.id;
            return (
              <Tooltip key={item.id} content={item.tooltip} placement="bottom">
                <button
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
              </Tooltip>
            );
          })}
        </nav>

        {/* Zone 3: Compact Theme Mode Cycle + Profile Action */}
        <div className="flex min-w-0 items-center gap-2">
          <Tooltip
            content={`Theme: ${getThemeLabel(themePreference)} mode — click to switch to ${getThemeLabel(nextTheme)}`}
            placement="bottom"
          >
            <button
              type="button"
              data-testid="topnav-theme-toggle"
              data-theme-preference={themePreference}
              onClick={() => onChangeTheme(nextTheme)}
              aria-label={`Theme mode: ${getThemeLabel(themePreference)}. Switch to ${getThemeLabel(nextTheme)} mode`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8D1C4] bg-white px-2.5 py-2 text-xs font-semibold text-[#1C232B] hover:border-[#1D4ED8] hover:text-[#1D4ED8] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
            >
              <ThemeIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">
                {getThemeLabel(themePreference)}
              </span>
            </button>
          </Tooltip>

          <Tooltip
            content="Manage student name, theme, sound feedback, age tier, and Mastery Seals"
            placement="bottom"
          >
            <button
              type="button"
              data-testid="topnav-profile-button"
              onClick={onOpenAccount}
              aria-label="Open student profile and mastery seals"
              className="inline-flex items-center gap-1.5 sm:gap-2 rounded-lg border border-[#D8D1C4] bg-white px-2.5 sm:px-3.5 py-2 text-xs font-semibold text-[#1C232B] hover:border-[#1D4ED8] hover:text-[#1D4ED8] transition-colors whitespace-nowrap min-w-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
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
              <span className="max-w-[88px] sm:max-w-[180px] truncate">
                {accountLabel}
              </span>
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Compact mobile navigation row */}
      <nav
        aria-label="Mobile navigation"
        className="flex lg:hidden items-center justify-between gap-1 overflow-x-auto border-t border-[#ECE7DD] bg-[#FAF8F4] px-2 py-1.5 text-xs font-medium"
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
