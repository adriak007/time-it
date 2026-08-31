import { describe, expect, it } from 'vitest';
import {
  clamp,
  formatScore,
  formatSignedDiff,
  formatTime,
  formatTimeCompact,
  formatTimeWithUnit,
  msToSeconds,
  secondsToMs,
} from '../time';

describe('formatTime', () => {
  it('renders two decimals for the canonical in-game display', () => {
    expect(formatTime(500)).toBe('0.50');
    expect(formatTime(1000)).toBe('1.00');
    expect(formatTime(3250)).toBe('3.25');
    expect(formatTime(10000)).toBe('10.00');
  });

  it('rounds sub-millisecond precision to the displayed decimals', () => {
    expect(formatTime(3246.71)).toBe('3.25');
    expect(formatTime(3244.4)).toBe('3.24');
  });

  it('handles zero and non-finite input without producing NaN', () => {
    expect(formatTime(0)).toBe('0.00');
    expect(formatTime(Number.NaN)).toBe('0.00');
  });

  it('appends the unit when asked', () => {
    expect(formatTimeWithUnit(3200)).toBe('3.20s');
  });
});

describe('formatTimeCompact', () => {
  it('drops noise for whole and simple values in menus', () => {
    expect(formatTimeCompact(5000)).toBe('5s');
    expect(formatTimeCompact(500)).toBe('0.5s');
    expect(formatTimeCompact(150)).toBe('0.15s');
    expect(formatTimeCompact(60000)).toBe('60s');
  });
});

describe('formatSignedDiff', () => {
  it('always signs a non-zero difference', () => {
    expect(formatSignedDiff(70)).toBe('+0.07');
    expect(formatSignedDiff(-80)).toBe('-0.08');
    expect(formatSignedDiff(300)).toBe('+0.30');
  });

  it('shows an unsigned zero when the rounded difference vanishes', () => {
    expect(formatSignedDiff(0)).toBe('0.00');
    expect(formatSignedDiff(3)).toBe('0.00');
    expect(formatSignedDiff(-4)).toBe('0.00');
  });
});

describe('ms/seconds conversion', () => {
  it('converts seconds to exact integer milliseconds', () => {
    expect(secondsToMs(0.15)).toBe(150);
    expect(secondsToMs(0.1)).toBe(100);
    expect(secondsToMs(3.2)).toBe(3200);
  });

  it('round-trips without floating point drift', () => {
    expect(secondsToMs(msToSeconds(450))).toBe(450);
  });
});

describe('formatScore', () => {
  it('groups thousands', () => {
    expect(formatScore(4820)).toBe('4,820');
    expect(formatScore(950)).toBe('950');
  });
});

describe('clamp', () => {
  it('bounds values on both sides', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});
