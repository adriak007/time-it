/**
 * Core domain types for Time It!
 * All time values are stored as INTEGER MILLISECONDS to avoid floating point drift.
 */

/** Unique id for a player within a session (1-4). */
export type PlayerId = 1 | 2 | 3 | 4;

/** How many humans share the device. */
export type PlayerCount = 1 | 2 | 3 | 4;

/** Rounds setting: a fixed count, or endless until the player quits. */
export type RoundsSetting = number | 'endless';

/** Quality bucket for a single attempt, derived from absolute error. */
export type RatingId =
  | 'impossible'
  | 'perfect'
  | 'amazing'
  | 'great'
  | 'good'
  | 'close'
  | 'notbad'
  | 'off'
  | 'wayoff';

export interface Rating {
  id: RatingId;
  /** Inclusive upper bound of absolute error (ms) for this bucket. */
  maxErrorMs: number;
  label: string;
  /** Design-token colour name used to theme the reveal. */
  tone: 'gold' | 'green' | 'lime' | 'neutral' | 'warn';
}

/** Whether the player stopped before or after the target. */
export type Direction = 'early' | 'late' | 'exact';

/** Lifecycle of one player's attempt inside a round. */
export type AttemptStatus = 'idle' | 'running' | 'finished' | 'invalid';

export interface PlayerAttempt {
  playerId: PlayerId;
  status: AttemptStatus;
  /** performance.now() at the start tap. null while idle. */
  startedAt: number | null;
  /** Measured duration in ms (float precision preserved). null until finished. */
  elapsedMs: number | null;
  /** Signed error: elapsed - target. Negative = early. */
  errorMs: number | null;
  /** Absolute error in ms, used for scoring and ranking. */
  absErrorMs: number | null;
  direction: Direction | null;
  rating: RatingId | null;
  /** Base points for the attempt itself, always within 0-1000. */
  score: number;
  /** Streak bonus earned on top of `score`. Small and capped. */
  streakBonus: number;
  /** What this attempt actually adds to the player total: score + bonus. */
  totalPoints: number;
}

export interface Round {
  index: number;
  targetMs: number;
  attempts: Record<PlayerId, PlayerAttempt>;
}

export interface Player {
  id: PlayerId;
  name: string;
  totalScore: number;
  /** Cumulative absolute error across the match — first tiebreak. */
  totalAbsErrorMs: number;
  /** Count of perfect/amazing-tier attempts — second tiebreak. */
  precisionHits: number;
  currentStreak: number;
  bestStreak: number;
}

export interface GameConfigInput {
  players: PlayerCount;
  playerNames: string[];
  minTargetMs: number;
  maxTargetMs: number;
  stepMs: number;
  rounds: RoundsSetting;
}

/** Top-level machine state for a session. */
export type GamePhase =
  | 'round_intro'
  | 'ready'
  | 'playing'
  | 'round_results'
  | 'game_over';

export interface GameSession {
  config: GameConfigInput;
  phase: GamePhase;
  roundIndex: number;
  rounds: Round[];
  players: Player[];
  /** Set when an attempt is voided by the app going to background. */
  interrupted: boolean;
}

/** Final standing for one player at match end. */
export interface StandingEntry {
  player: Player;
  rank: number;
  /** True when this entry shares its rank with another (unbroken tie). */
  tied: boolean;
}
