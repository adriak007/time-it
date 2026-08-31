/**
 * Random source, isolated behind an interface so a future Daily Challenge can
 * swap in a deterministic seeded generator without touching game logic.
 */
export type RandomSource = () => number;

export const defaultRandom: RandomSource = Math.random;

/**
 * mulberry32 — small, fast, well-distributed 32-bit PRNG.
 * Same seed always yields the same sequence.
 */
export const createSeededRandom = (seed: number): RandomSource => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Stable seed for a given calendar day, e.g. 2026-08-29 -> integer. */
export const seedForDate = (date: Date): number => {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return y * 10000 + m * 100 + d;
};
