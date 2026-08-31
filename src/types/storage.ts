import type { GameConfigInput } from './game';

export interface Settings {
  sound: boolean;
  music: boolean;
  haptics: boolean;
  reduceMotion: boolean;
  highContrast: boolean;
}

export interface Stats {
  gamesPlayed: number;
  roundsPlayed: number;
  /** Sum of absolute errors, used with roundsPlayed for the average. */
  totalAbsErrorMs: number;
  /** Best (lowest) single-attempt absolute error, ms. null when none yet. */
  bestAbsErrorMs: number | null;
  perfectHits: number;
  /** Best single-match total score. */
  bestScore: number;
  longestStreak: number;
  earlyCount: number;
  lateCount: number;
}

export interface PersistedState {
  settings: Settings;
  stats: Stats;
  lastConfig: GameConfigInput | null;
  tutorialCompleted: boolean;
}
