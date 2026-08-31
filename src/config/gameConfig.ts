import type {
  GameConfigInput,
  PlayerCount,
  Rating,
  RoundsSetting,
  Settings,
  Stats,
} from '../types';
import { PLAYER_LABEL } from './strings';

export const GAME_VERSION = '1.0.0';
export const GAME_NAME = 'Time It!';
export const GAME_TAGLINE = 'Um jogo sobre confiar na sua noção de tempo.';

/** localStorage namespace. Bump the suffix on a breaking schema change. */
export const STORAGE_KEY = 'timeit.v1';

/* ------------------------------------------------------------------ */
/* Timing                                                              */
/* ------------------------------------------------------------------ */

export const TIMING = {
  /**
   * Guard between the start tap and an accepted stop tap. Protects against a
   * single physical press registering twice (bounce / synthetic duplicate)
   * without blocking legitimately short targets — the minimum target is 100ms,
   * and a human cannot deliberately tap twice inside 60ms.
   */
  minAttemptMs: 60,
  /** Suspense pause after the final stop before the reveal animates in. */
  revealDelayMs: 380,
  /** Beat between the target line and the player's time during the reveal. */
  revealStaggerMs: 260,
  /** Seconds shown in the pre-round countdown (3, 2, 1, GO). */
  countdownSteps: 3,
  countdownStepMs: 700,
  /** How long the round intro (target announcement) stays up. */
  roundIntroMs: 1500,
  /** Splash duration on cold start. Kept short — never delay the menu. */
  splashMs: 1100,
} as const;

/* ------------------------------------------------------------------ */
/* Target generation                                                   */
/* ------------------------------------------------------------------ */

export const TARGET_LIMITS = {
  absoluteMinMs: 100,
  absoluteMaxMs: 60_000,
  /** Max/min must differ by at least one step. */
  minSpanMs: 100,
} as const;

/** Step options offered in Custom Game, in integer ms. */
export const STEP_OPTIONS = [10, 50, 100, 150, 250, 500, 1000] as const;

/** Quick presets for the min-target selector (ms). */
export const MIN_TARGET_PRESETS = [100, 500, 1000, 2000, 5000] as const;

/** Quick presets for the max-target selector (ms). */
export const MAX_TARGET_PRESETS = [5000, 10_000, 20_000, 30_000, 60_000] as const;

export const ROUND_OPTIONS: RoundsSetting[] = [1, 3, 5, 10, 15, 20, 'endless'];

export const MAX_PLAYERS = 4;
export const MAX_NAME_LENGTH = 12;

export const defaultPlayerName = (index: number) => `${PLAYER_LABEL} ${index + 1}`;

export const defaultPlayerNames = (count: PlayerCount = MAX_PLAYERS): string[] =>
  Array.from({ length: count }, (_, i) => defaultPlayerName(i));


/** Quick Play: start instantly with a friendly, well-balanced default. */
export const QUICK_PLAY_CONFIG: GameConfigInput = {
  players: 1,
  playerNames: [defaultPlayerName(0)],
  minTargetMs: 1000,
  maxTargetMs: 10_000,
  stepMs: 100,
  rounds: 5,
};

export const DEFAULT_CUSTOM_CONFIG: GameConfigInput = {
  players: 2,
  playerNames: defaultPlayerNames(),
  minTargetMs: 1000,
  maxTargetMs: 10_000,
  stepMs: 100,
  rounds: 5,
};

/* ------------------------------------------------------------------ */
/* Ratings                                                             */
/* ------------------------------------------------------------------ */

/**
 * Ordered from tightest to loosest. `determineRating` returns the first bucket
 * whose `maxErrorMs` covers the absolute error.
 */
export const RATINGS: Rating[] = [
  { id: 'impossible', maxErrorMs: 10, label: 'IMPOSSÍVEL!', tone: 'gold' },
  { id: 'perfect', maxErrorMs: 25, label: 'PERFEITO!', tone: 'gold' },
  { id: 'amazing', maxErrorMs: 50, label: 'INCRÍVEL!', tone: 'green' },
  { id: 'great', maxErrorMs: 100, label: 'MUITO BOM!', tone: 'green' },
  { id: 'good', maxErrorMs: 200, label: 'BOM!', tone: 'lime' },
  { id: 'close', maxErrorMs: 400, label: 'QUASE!', tone: 'lime' },
  { id: 'notbad', maxErrorMs: 750, label: 'RAZOÁVEL', tone: 'neutral' },
  { id: 'off', maxErrorMs: 1500, label: 'LONGE', tone: 'neutral' },
  { id: 'wayoff', maxErrorMs: Number.POSITIVE_INFINITY, label: 'MUITO LONGE!', tone: 'warn' },
];

/** Ratings that count as a "precision hit" for tiebreaks and the perfect FX. */
export const PRECISION_RATINGS = new Set(['impossible', 'perfect', 'amazing']);

/** Absolute error at or below which the celebratory Perfect FX fires. */
export const PERFECT_FX_THRESHOLD_MS = 25;

/* ------------------------------------------------------------------ */
/* Scoring                                                             */
/* ------------------------------------------------------------------ */

export const SCORING = {
  maxScore: 1000,
  /**
   * Absolute-error tolerance (ms) and relative-error tolerance (fraction of
   * target). See services/scoring.ts for the full formula and rationale.
   */
  absToleranceMs: 2000,
  relTolerance: 0.5,
  /** Curve sharpness. >1 keeps near-misses rewarding, punishes big misses. */
  falloffExponent: 1.6,
  /** Blend between absolute and relative error terms (0 = pure abs, 1 = pure rel). */
  relativeWeight: 0.3,
} as const;

export const STREAK = {
  /** Absolute error at or below this extends the streak. */
  thresholdMs: 100,
  /** Bonus points per streak level beyond the first. */
  bonusPerLevel: 25,
  /** Cap so a streak can never dominate the score. */
  maxBonus: 150,
  /** Streak length at which the on-screen badge appears. */
  displayFrom: 2,
} as const;

/* ------------------------------------------------------------------ */
/* Feedback                                                            */
/* ------------------------------------------------------------------ */

export const HAPTICS = {
  startMs: 12,
  stopMs: 28,
  perfectPattern: [0, 40, 60, 90] as number[],
  countdownMs: 10,
  uiMs: 8,
} as const;

export const ANIMATION = {
  buttonPressScale: 0.96,
  fastMs: 140,
  baseMs: 240,
  slowMs: 420,
} as const;

/** Per-player accent, used sparingly (labels, borders) to avoid a rainbow UI. */
export const PLAYER_ACCENTS: Record<number, string> = {
  1: '#3BE07C',
  2: '#43B8FF',
  3: '#FF9F45',
  4: '#B27BFF',
};

/* ------------------------------------------------------------------ */
/* Defaults for persisted state                                        */
/* ------------------------------------------------------------------ */

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  music: false,
  haptics: true,
  reduceMotion: false,
  highContrast: false,
};

export const DEFAULT_STATS: Stats = {
  gamesPlayed: 0,
  roundsPlayed: 0,
  totalAbsErrorMs: 0,
  bestAbsErrorMs: null,
  perfectHits: 0,
  bestScore: 0,
  longestStreak: 0,
  earlyCount: 0,
  lateCount: 0,
};

/**
 * Developer overlay. Shows raw timings on the result screen while tuning.
 *
 * Guarded by import.meta.env.DEV so it is impossible to ship enabled: in a
 * production build the condition is statically false and the overlay code is
 * removed by tree-shaking. Flip the local flag to true only while developing.
 */
const DEV_OVERLAY_ENABLED = false;

// `import.meta.env` é injetado pelo Vite e não existe no Node — e este mesmo
// arquivo é compilado também pelo servidor. O acesso fica atrás de um cast
// para que os dois tsconfig aceitem, mantendo a substituição estática do Vite
// (que continua removendo o overlay do bundle de produção).
const viteEnv = (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env;

export const DEV_MODE = DEV_OVERLAY_ENABLED && Boolean(viteEnv?.DEV);
