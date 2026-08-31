import { describe, expect, it } from 'vitest';
import { createSeededRandom } from '../random';
import { generateTarget, isValidTarget, normalizeRange, validTargets } from '../target';

describe('validTargets', () => {
  it('enumerates an inclusive range on the step grid', () => {
    expect(validTargets(1000, 3000, 500)).toEqual([1000, 1500, 2000, 2500, 3000]);
  });

  it('produces exact values for a 0.15s step (no floating point drift)', () => {
    const values = validTargets(150, 900, 150);
    expect(values).toEqual([150, 300, 450, 600, 750, 900]);
    values.forEach((v) => expect(Number.isInteger(v)).toBe(true));
  });

  it('supports a 0.01s step', () => {
    const values = validTargets(1000, 1050, 10);
    expect(values).toEqual([1000, 1010, 1020, 1030, 1040, 1050]);
  });

  it('supports a 1s step yielding whole seconds', () => {
    expect(validTargets(1000, 5000, 1000)).toEqual([1000, 2000, 3000, 4000, 5000]);
  });

  it('never exceeds max when the range is not a whole multiple of the step', () => {
    const values = validTargets(1000, 3300, 500);
    expect(values).toEqual([1000, 1500, 2000, 2500, 3000]);
    expect(Math.max(...values)).toBeLessThanOrEqual(3300);
  });

  it('returns a single value when min equals max', () => {
    expect(validTargets(2000, 2000, 100)).toEqual([2000]);
  });
});

describe('generateTarget', () => {
  const range = { min: 1000, max: 10000, step: 100 };

  it('only ever returns values on the step grid inside the range', () => {
    const random = createSeededRandom(42);
    for (let i = 0; i < 500; i += 1) {
      const target = generateTarget(range.min, range.max, range.step, null, random);
      expect(target).toBeGreaterThanOrEqual(range.min);
      expect(target).toBeLessThanOrEqual(range.max);
      expect((target - range.min) % range.step).toBe(0);
    }
  });

  it('avoids repeating the previous target when an alternative exists', () => {
    const random = createSeededRandom(7);
    for (let i = 0; i < 200; i += 1) {
      expect(generateTarget(1000, 2000, 500, 1500, random)).not.toBe(1500);
    }
  });

  it('still returns the only legal value when no alternative exists', () => {
    expect(generateTarget(2000, 2000, 100, 2000)).toBe(2000);
  });

  it('is deterministic for a given seed, enabling a future daily challenge', () => {
    const a = Array.from({ length: 5 }, () => 0);
    const randomA = createSeededRandom(2026);
    const first = a.map(() => generateTarget(1000, 10000, 100, null, randomA));
    const randomB = createSeededRandom(2026);
    const second = a.map(() => generateTarget(1000, 10000, 100, null, randomB));
    expect(first).toEqual(second);
  });
});

describe('isValidTarget', () => {
  it('accepts on-grid values and rejects off-grid or out-of-range ones', () => {
    expect(isValidTarget(1500, 1000, 10000, 500)).toBe(true);
    expect(isValidTarget(1450, 1000, 10000, 500)).toBe(false);
    expect(isValidTarget(500, 1000, 10000, 500)).toBe(false);
    expect(isValidTarget(10500, 1000, 10000, 500)).toBe(false);
  });
});

describe('normalizeRange', () => {
  it('keeps a valid range untouched', () => {
    expect(normalizeRange(1000, 10000)).toEqual({ minMs: 1000, maxMs: 10000 });
  });

  it('forces max above min when the input inverts them', () => {
    const { minMs, maxMs } = normalizeRange(5000, 2000);
    expect(maxMs).toBeGreaterThan(minMs);
  });

  it('clamps to the absolute limits', () => {
    const { minMs, maxMs } = normalizeRange(0, 999999);
    expect(minMs).toBeGreaterThanOrEqual(100);
    expect(maxMs).toBeLessThanOrEqual(60000);
  });
});
