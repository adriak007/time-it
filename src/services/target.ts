import { TARGET_LIMITS } from '../config/gameConfig';
import { defaultRandom, type RandomSource } from './random';

/**
 * All arithmetic here is on integer milliseconds. A target is always
 * `minMs + k * stepMs` for some integer k, and never exceeds maxMs.
 */

/** Every legal target for a range, ascending. Guaranteed non-empty. */
export const validTargets = (minMs: number, maxMs: number, stepMs: number): number[] => {
  const step = Math.max(1, Math.round(stepMs));
  const min = Math.round(minMs);
  const max = Math.round(maxMs);
  if (max < min) return [min];

  // floor() means a range that is not an exact multiple of the step simply
  // stops at the last value that still fits — never overshooting maxMs.
  const steps = Math.floor((max - min) / step);
  const values: number[] = [];
  for (let i = 0; i <= steps; i += 1) values.push(min + i * step);
  return values;
};

export const isValidTarget = (
  targetMs: number,
  minMs: number,
  maxMs: number,
  stepMs: number,
): boolean => {
  const step = Math.max(1, Math.round(stepMs));
  if (targetMs < minMs || targetMs > maxMs) return false;
  return (Math.round(targetMs) - Math.round(minMs)) % step === 0;
};

/**
 * Pick a target for the next round.
 *
 * @param previousMs last round's target; avoided when an alternative exists,
 *        so consecutive rounds don't repeat the same number.
 */
export const generateTarget = (
  minMs: number,
  maxMs: number,
  stepMs: number,
  previousMs?: number | null,
  random: RandomSource = defaultRandom,
): number => {
  const candidates = validTargets(minMs, maxMs, stepMs);
  const pool =
    previousMs != null && candidates.length > 1
      ? candidates.filter((v) => v !== previousMs)
      : candidates;
  const source = pool.length > 0 ? pool : candidates;
  const index = Math.floor(random() * source.length);
  // Guard the (theoretically impossible) random() === 1 case.
  return source[Math.min(index, source.length - 1)];
};

/** Clamp a user-entered range into legal bounds with max always above min. */
export const normalizeRange = (
  minMs: number,
  maxMs: number,
): { minMs: number; maxMs: number } => {
  const { absoluteMinMs, absoluteMaxMs, minSpanMs } = TARGET_LIMITS;
  const min = Math.min(Math.max(Math.round(minMs), absoluteMinMs), absoluteMaxMs - minSpanMs);
  const max = Math.min(Math.max(Math.round(maxMs), min + minSpanMs), absoluteMaxMs);
  return { minMs: min, maxMs: max };
};
