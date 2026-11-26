import type { AchievementEvaluation } from '@/lib/achievements';
import type { AchievementId, StudentProfile, ThemePreference } from '@/lib/types';

export type AccountModalSection = 'profile' | 'auth';
export type AccountAuthMode = 'signin' | 'signup' | 'recovery';

export interface AccountModalProps {
  open: boolean;
  onClose: () => void;
  initialSection?: AccountModalSection;
  initialAuthMode?: AccountAuthMode;
  registrationGateGameTitle?: string | null;
  profile: StudentProfile;
  matchCount: number;
  achievementEvaluation: AchievementEvaluation;
  recentlyUnlockedBadgeIds?: AchievementId[];
  themePreference: ThemePreference;
  onChangeTheme: (next: ThemePreference) => void;
  onUpdateProfile: (next: StudentProfile) => void;
  onClearLocalProgress: () => void;
  onOpenNotebook: () => void;
}

export type AccountBodyProps = Omit<AccountModalProps, 'open'>;

export function evaluatePasswordStrength(pw: string): {
  score: number;
  label: string;
  hasLength: boolean;
  hasLetter: boolean;
  hasNumber: boolean;
} {
  const hasLength = pw.length >= 8;
  const hasLetter = /[A-Za-z]/.test(pw);
  const hasNumber = /\d/.test(pw);
  const score = [hasLength, hasLetter, hasNumber].filter(Boolean).length;
  const label =
    score === 0
      ? 'Enter 8+ characters'
      : score === 1
        ? 'Weak'
        : score === 2
          ? 'Fair'
          : 'Strong';
  return { score, label, hasLength, hasLetter, hasNumber };
}
