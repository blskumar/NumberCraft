export type AgeTier = 'explorers' | 'challengers' | 'strategists';

export type PlayMode = 'solo' | 'vs-ai' | 'local';

export type AiDifficulty = 'apprentice' | 'scholar' | 'master';

export type FactorVariant = 'classic' | 'prime-trap';

export type TileOwner = 'unclaimed' | 'p1' | 'p2';

export type NumberKind = 'unit' | 'prime' | 'deficient' | 'perfect' | 'abundant';

export interface TierSpec {
  id: AgeTier;
  label: string;
  ageRange: string;
  boardMax: number;
  columns: number;
  arithmeticSummary: string;
  probabilitySummary: string;
  numberTheorySummary: string;
}

export interface NumberClassification {
  value: number;
  kind: NumberKind;
  properDivisors: number[];
  divisorSum: number;
  summary: string;
}

export interface FactorMovePreview {
  tile: number;
  legal: boolean;
  claimPoints: number;
  primeBonus: number;
  opponentDivisors: number[];
  opponentPoints: number;
  netSwing: number;
  classification: NumberClassification;
}

export interface FactorMoveRecord {
  turnNumber: number;
  actor: 'p1' | 'p2';
  actorName: string;
  claimedTile: number;
  claimPoints: number;
  primeBonus: number;
  surrenderedDivisors: number[];
  surrenderedPoints: number;
  netSwing: number;
  insight: string;
}

export interface FactorGameState {
  tier: AgeTier;
  boardMax: number;
  mode: PlayMode;
  aiDifficulty: AiDifficulty;
  variant: FactorVariant;
  player1Name: string;
  player2Name: string;
  tiles: Record<number, TileOwner>;
  scores: {
    p1: number;
    p2: number;
  };
  primesClaimed: {
    p1: number;
    p2: number;
  };
  currentTurn: 'p1' | 'p2';
  status: 'playing' | 'gameover';
  winner: 'p1' | 'p2' | 'draw' | null;
  moves: FactorMoveRecord[];
  lastInsight: string;
  sweptTiles: number[];
}

export type ArithmeticGameId =
  | 'addition-attack'
  | 'subtraction-sprint'
  | 'multiplication-mastery';

export type ArithmeticPace = 'relaxed' | 'standard' | 'blitz';

export interface ArithmeticMatchMeta {
  gameId: ArithmeticGameId;
  pace: ArithmeticPace;
  solved: number;
  attempted: number;
  accuracyPercent: number;
  bestStreak: number;
  durationSeconds: number;
  maxStageReached?: number;
  tableFocus?: string;
  adaptiveEnabled?: boolean;
  startAdaptiveLevel?: number;
  endAdaptiveLevel?: number;
  peakAdaptiveLevel?: number;
}

export type DailyArchetype =
  | 'equation-vault'
  | 'divisor-cipher'
  | 'balance-scale'
  | 'mystery-number';

export interface DailyChallengeCompletion {
  dateKey: string; // YYYY-MM-DD
  editionNumber: number;
  tier: AgeTier;
  archetype: DailyArchetype;
  archetypeTitle: string;
  solved: boolean;
  stepsSolved: number;
  secondsUsed: number;
  timeLimitSeconds: number;
  mistakes: number;
  hintsUsed: number;
  score: number;
  streakDays?: number;
  streakBonus?: number;
  completedAt: string;
}

export interface DailyMatchMeta {
  dateKey: string;
  editionNumber: number;
  archetypeTitle: string;
  stepsSolved: number;
  secondsUsed: number;
  timeLimitSeconds: number;
  mistakes: number;
  hintsUsed: number;
}

export interface MatchRecord {
  id: string;
  gameTitle: string;
  mode: PlayMode;
  aiDifficulty?: AiDifficulty;
  tier: AgeTier;
  variant: FactorVariant;
  playerScore: number;
  opponentScore: number;
  opponentName: string;
  result: 'win' | 'loss' | 'draw';
  primesClaimed: number;
  playedAt: string;
  arithmeticMeta?: ArithmeticMatchMeta;
  dailyMeta?: DailyMatchMeta;
}

export type AchievementId =
  | 'first-victory'
  | 'perfect-streak'
  | 'top-scorer'
  | 'prime-collector'
  | 'scholar-rival'
  | 'master-strategist'
  | 'taxman-victor'
  | 'tier-explorer'
  | 'daily-pioneer'
  | 'daily-lightning'
  | 'daily-flawless'
  | 'daily-streak-3';

export type AchievementAccent = 'cobalt' | 'emerald' | 'ochre';

export interface EarnedBadgeRecord {
  id: AchievementId;
  unlockedAt: string;
  triggerMatchId?: string;
}

export type AuthProviderKind = 'guest' | 'google' | 'email';

export interface StudentProfile {
  displayName: string;
  ageTier: AgeTier;
  soundEnabled: boolean;
  sessionKind: 'guest' | 'signed-in-preview';
  authProvider?: AuthProviderKind;
  email?: string | null;
  sharedDeviceMode?: boolean;
  featuredBadgeId?: AchievementId | null;
}
