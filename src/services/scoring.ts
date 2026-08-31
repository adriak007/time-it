import {
  PRECISION_RATINGS,
  RATINGS,
  SCORING,
  STREAK,
} from '../config/gameConfig';
import type { Direction, Rating, RatingId } from '../types';
import { clamp } from '../utils/time';

/**
 * ============================ SCORING FORMULA ============================
 *
 * Goal: 0-1000 points, smooth (not bucketed), and fair across target lengths.
 * Being 100ms off a 0.50s target is a far worse read of time than being 100ms
 * off a 20s target, so the score blends two views of the same error:
 *
 *   1. ABSOLUTE error  — how many ms off, against a fixed tolerance.
 *        eAbs = |error| / absToleranceMs            (2000ms)
 *
 *   2. RELATIVE error  — the error as a fraction of the target, against a
 *      percentage tolerance.
 *        eRel = (|error| / target) / relTolerance   (50%)
 *
 * They are combined with a fixed weight:
 *
 *        e = (1 - w) * eAbs + w * eRel              (w = 0.30)
 *
 * and mapped through a decaying curve clamped at zero:
 *
 *        score = 1000 * (1 - min(e, 1))^k           (k = 1.6)
 *
 * The exponent k > 1 makes the curve flat near zero — tiny errors stay near
 * 1000, so precision is rewarded generously — then fall away faster as the
 * error grows. Score reaches 0 once the blended error hits the tolerance and
 * never goes negative.
 *
 * Weighting the absolute term more heavily (0.70) keeps short targets playable
 * while the relative term still makes precision matter more as targets grow:
 * a 200ms miss is worth 552 at 0.50s but 881 at 20s.
 *
 * Actual scores (verified by the unit tests in scoring.test.ts):
 *
 *   error →     10ms   25ms   50ms  100ms  200ms  500ms  1000ms
 *   0.50s tgt    975    939    879    764    552     92       0
 *   1.00s tgt    985    962    925    852    714    357       8
 *   3.00s tgt    991    978    956    913    830    598     279
 *   5.00s tgt    992    981    963    926    854    651     362
 *   10.0s tgt    993    984    967    935    872    693     430
 *   20.0s tgt    994    985    970    940    881    714     465
 *
 * A perfect stop scores exactly 1000 at every target length.
 * =======================================================================
 */
export const calculateScore = (absErrorMs: number, targetMs: number): number => {
  const { maxScore, absToleranceMs, relTolerance, falloffExponent, relativeWeight } = SCORING;
  const absError = Math.abs(absErrorMs);
  if (absError === 0) return maxScore;

  const eAbs = absError / absToleranceMs;
  // Guard against a zero/invalid target; relative error is then meaningless.
  const eRel = targetMs > 0 ? absError / targetMs / relTolerance : eAbs;

  const blended = (1 - relativeWeight) * eAbs + relativeWeight * eRel;
  const remaining = 1 - Math.min(blended, 1);
  const score = maxScore * Math.pow(remaining, falloffExponent);

  return clamp(Math.round(score), 0, maxScore);
};

/** Signed error: negative = stopped early, positive = stopped late. */
export const calculateDifference = (elapsedMs: number, targetMs: number): number =>
  elapsedMs - targetMs;

/**
 * Direction as shown to the player. Uses the DISPLAYED value (2 decimals) so
 * the label never contradicts the numbers on screen: a 3ms miss renders as
 * "0.00" and reads as `exact`, not "LATE".
 */
export const determineDirection = (errorMs: number, decimals = 2): Direction => {
  const factor = Math.pow(10, decimals);
  const displayed = Math.round((errorMs / 1000) * factor) / factor;
  if (displayed === 0) return 'exact';
  return displayed < 0 ? 'early' : 'late';
};

export const determineRating = (absErrorMs: number): RatingId => {
  const error = Math.abs(absErrorMs);
  const match = RATINGS.find((r) => error <= r.maxErrorMs);
  return (match ?? RATINGS[RATINGS.length - 1]).id;
};

export const getRating = (id: RatingId): Rating =>
  RATINGS.find((r) => r.id === id) ?? RATINGS[RATINGS.length - 1];

export const isPrecisionHit = (rating: RatingId): boolean => PRECISION_RATINGS.has(rating);

/** Does this attempt extend the streak? */
export const continuesStreak = (absErrorMs: number): boolean =>
  Math.abs(absErrorMs) <= STREAK.thresholdMs;

/**
 * Streak bonus for an attempt, given the streak length INCLUDING this attempt.
 * A streak of 1 pays nothing; each additional level adds a small, capped bonus
 * so momentum feels good without deciding the match on its own.
 */
export const calculateStreakBonus = (streakLength: number): number => {
  if (streakLength < 2) return 0;
  return Math.min((streakLength - 1) * STREAK.bonusPerLevel, STREAK.maxBonus);
};
