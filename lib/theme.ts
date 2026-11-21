import type { ThemePreference } from './types';

export const THEME_STORAGE_KEY = 'numbercraft_theme_v1';

export const THEME_ORDER: ThemePreference[] = ['light', 'dark', 'system'];

export function isValidThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function resolveEffectiveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean
): 'light' | 'dark' {
  if (preference === 'dark') return 'dark';
  if (preference === 'light') return 'light';
  return systemPrefersDark ? 'dark' : 'light';
}

export function cycleThemePreference(current: ThemePreference): ThemePreference {
  const idx = THEME_ORDER.indexOf(current);
  return THEME_ORDER[(idx + 1) % THEME_ORDER.length];
}

export function getThemeLabel(preference: ThemePreference): string {
  if (preference === 'light') return 'Light';
  if (preference === 'dark') return 'Dark';
  return 'System';
}

export function loadThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isValidThemePreference(raw)) return raw;
  } catch {
    // Ignore storage read errors
  }
  return 'system';
}

/** The explicitly stored theme key, or null when absent/invalid (no 'system' fallback). */
export function readStoredThemePreference(): ThemePreference | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isValidThemePreference(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function saveThemePreference(preference: ThemePreference): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Ignore storage write errors
  }
}

export function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function applyThemeToDocument(preference: ThemePreference): 'light' | 'dark' {
  const effective = resolveEffectiveTheme(preference, getSystemPrefersDark());
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.dataset.theme = effective;
    root.dataset.themePreference = preference;
    root.classList.toggle('dark', effective === 'dark');
    root.style.colorScheme = effective;
  }
  return effective;
}
