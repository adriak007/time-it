import { defaultPlayerName } from '../config/gameConfig';
import {
  calculateDifference,
  calculateScore,
  calculateStreakBonus,
  continuesStreak,
  determineDirection,
  determineRating,
  isPrecisionHit,
} from '../services/scoring';
import { generateTarget } from '../services/target';
import type { RandomSource } from '../services/random';
import type {
  GameConfigInput,
  GameSession,
  Player,
  PlayerAttempt,
  PlayerId,
  Round,
} from '../types';

/** Player ids present for a given player count: [1], [1,2], ... */
export const playerIds = (count: number): PlayerId[] =>
  Array.from({ length: count }, (_, i) => (i + 1) as PlayerId);

const emptyAttempt = (playerId: PlayerId): PlayerAttempt => ({
  playerId,
  status: 'idle',
  startedAt: null,
  elapsedMs: null,
  errorMs: null,
  absErrorMs: null,
  direction: null,
  rating: null,
  score: 0,
  streakBonus: 0,
  totalPoints: 0,
});

export const createAttempts = (count: number): Record<PlayerId, PlayerAttempt> => {
  const attempts = {} as Record<PlayerId, PlayerAttempt>;
  playerIds(count).forEach((id) => {
    attempts[id] = emptyAttempt(id);
  });
  return attempts;
};

const createPlayers = (config: GameConfigInput): Player[] =>
  playerIds(config.players).map((id) => ({
    id,
    name: (config.playerNames[id - 1] || defaultPlayerName(id - 1)).trim() ||
      defaultPlayerName(id - 1),
    totalScore: 0,
    totalAbsErrorMs: 0,
    precisionHits: 0,
    currentStreak: 0,
    bestStreak: 0,
  }));

export const createRound = (
  index: number,
  config: GameConfigInput,
  previousTargetMs: number | null,
  random?: RandomSource,
): Round => ({
  index,
  targetMs: generateTarget(
    config.minTargetMs,
    config.maxTargetMs,
    config.stepMs,
    previousTargetMs,
    random,
  ),
  attempts: createAttempts(config.players),
});

export const createSession = (
  config: GameConfigInput,
  random?: RandomSource,
): GameSession => ({
  config,
  phase: 'round_intro',
  roundIndex: 0,
  rounds: [createRound(0, config, null, random)],
  players: createPlayers(config),
  interrupted: false,
});

export const currentRound = (session: GameSession): Round => session.rounds[session.roundIndex];

export const isLastRound = (session: GameSession): boolean => {
  if (session.config.rounds === 'endless') return false;
  return session.roundIndex >= session.config.rounds - 1;
};

export const totalRoundsLabel = (session: GameSession): string =>
  session.config.rounds === 'endless' ? '∞' : String(session.config.rounds);

/** All players have either finished or been invalidated. */
export const allAttemptsResolved = (round: Round, playerCount: number): boolean =>
  playerIds(playerCount).every((id) => {
    const status = round.attempts[id].status;
    return status === 'finished' || status === 'invalid';
  });

export const anyAttemptRunning = (round: Round, playerCount: number): boolean =>
  playerIds(playerCount).some((id) => round.attempts[id].status === 'running');

/**
 * Resolve a stop: computes error, rating and score from the raw elapsed time.
 * `elapsedMs` keeps full float precision so two visually identical results can
 * still be ranked correctly.
 */
export const resolveAttempt = (
  attempt: PlayerAttempt,
  elapsedMs: number,
  targetMs: number,
  streakBeforeAttempt: number,
): { attempt: PlayerAttempt; newStreak: number } => {
  const errorMs = calculateDifference(elapsedMs, targetMs);
  const absErrorMs = Math.abs(errorMs);
  const rating = determineRating(absErrorMs);
  const baseScore = calculateScore(absErrorMs, targetMs);

  const extends_ = continuesStreak(absErrorMs);
  const newStreak = extends_ ? streakBeforeAttempt + 1 : 0;
  const streakBonus = extends_ ? calculateStreakBonus(newStreak) : 0;

  return {
    attempt: {
      ...attempt,
      status: 'finished',
      elapsedMs,
      errorMs,
      absErrorMs,
      direction: determineDirection(errorMs),
      rating,
      score: baseScore,
      streakBonus,
      totalPoints: baseScore + streakBonus,
    },
    newStreak,
  };
};

/** Fold a finished round's attempts into the running player totals. */
export const applyRoundToPlayers = (players: Player[], round: Round): Player[] =>
  players.map((player) => {
    const attempt = round.attempts[player.id];
    if (!attempt || attempt.status !== 'finished' || attempt.absErrorMs == null) {
      return player;
    }
    return {
      ...player,
      totalScore: player.totalScore + attempt.totalPoints,
      totalAbsErrorMs: player.totalAbsErrorMs + attempt.absErrorMs,
      precisionHits:
        player.precisionHits + (attempt.rating && isPrecisionHit(attempt.rating) ? 1 : 0),
    };
  });
