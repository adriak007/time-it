import { describe, expect, it } from 'vitest';
import type { RatingId } from '../../types';
import {
  calculateDifference,
  calculateScore,
  calculateStreakBonus,
  continuesStreak,
  determineDirection,
  determineRating,
  getRating,
  isPrecisionHit,
} from '../scoring';

const RATING_IDS: RatingId[] = [
  'impossible', 'perfect', 'amazing', 'great', 'good', 'close', 'notbad', 'off', 'wayoff',
];

describe('calculateDifference', () => {
  it('is negative when early and positive when late', () => {
    expect(calculateDifference(3120, 3200)).toBe(-80);
    expect(calculateDifference(3270, 3200)).toBe(70);
    expect(calculateDifference(3200, 3200)).toBe(0);
  });
});

describe('determineDirection', () => {
  it('classifies a clear early and late stop', () => {
    expect(determineDirection(-80)).toBe('early');
    expect(determineDirection(70)).toBe('late');
  });

  it('reads as exact when the displayed difference rounds to zero', () => {
    expect(determineDirection(0)).toBe('exact');
    expect(determineDirection(4)).toBe('exact');
    expect(determineDirection(-4)).toBe('exact');
  });
});

describe('determineRating', () => {
  it('maps errors to the documented buckets', () => {
    expect(determineRating(0)).toBe('impossible');
    expect(determineRating(10)).toBe('impossible');
    expect(determineRating(11)).toBe('perfect');
    expect(determineRating(25)).toBe('perfect');
    expect(determineRating(26)).toBe('amazing');
    expect(determineRating(50)).toBe('amazing');
    expect(determineRating(51)).toBe('great');
    expect(determineRating(100)).toBe('great');
    expect(determineRating(101)).toBe('good');
    expect(determineRating(200)).toBe('good');
    expect(determineRating(201)).toBe('close');
    expect(determineRating(400)).toBe('close');
    expect(determineRating(401)).toBe('notbad');
    expect(determineRating(750)).toBe('notbad');
    expect(determineRating(751)).toBe('off');
    expect(determineRating(1500)).toBe('off');
    expect(determineRating(1501)).toBe('wayoff');
    expect(determineRating(99999)).toBe('wayoff');
  });

  it('treats the sign as irrelevant', () => {
    expect(determineRating(-30)).toBe(determineRating(30));
  });

  it('exposes a non-empty label and the right tone for every bucket', () => {
    // Deliberately not asserting the literal text: the labels are translated,
    // so pinning them here would break on every copy change.
    RATING_IDS.forEach((id) => {
      expect(getRating(id).label.length).toBeGreaterThan(0);
    });
    expect(getRating('perfect').tone).toBe('gold');
    expect(getRating('wayoff').tone).toBe('warn');
  });

  it('marks only the tightest buckets as precision hits', () => {
    expect(isPrecisionHit('impossible')).toBe(true);
    expect(isPrecisionHit('perfect')).toBe(true);
    expect(isPrecisionHit('amazing')).toBe(true);
    expect(isPrecisionHit('great')).toBe(false);
  });
});

describe('calculateScore', () => {
  it('awards a full 1000 for a perfect stop at any target length', () => {
    [500, 1000, 3000, 5000, 10000, 20000].forEach((target) => {
      expect(calculateScore(0, target)).toBe(1000);
    });
  });

  it('never returns a value outside 0-1000', () => {
    [500, 1000, 5000, 20000].forEach((target) => {
      [0, 1, 50, 500, 5000, 50000].forEach((error) => {
        const score = calculateScore(error, target);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1000);
      });
    });
  });

  it('decreases monotonically as the error grows', () => {
    const errors = [0, 10, 25, 50, 100, 200, 400, 800, 1600, 3200];
    const scores = errors.map((e) => calculateScore(e, 5000));
    for (let i = 1; i < scores.length; i += 1) {
      expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
    }
  });

  it('treats the same absolute error as harder on a short target', () => {
    expect(calculateScore(100, 500)).toBeLessThan(calculateScore(100, 20000));
    expect(calculateScore(200, 1000)).toBeLessThan(calculateScore(200, 10000));
  });

  it('keeps a 10ms miss above 970 everywhere, as the design intends', () => {
    [500, 1000, 3000, 5000, 10000, 20000].forEach((target) => {
      expect(calculateScore(10, target)).toBeGreaterThan(970);
    });
  });

  it('matches the score table documented in the formula comment', () => {
    expect(calculateScore(10, 500)).toBe(975);
    expect(calculateScore(100, 500)).toBe(764);
    expect(calculateScore(100, 1000)).toBe(852);
    expect(calculateScore(200, 3000)).toBe(830);
    expect(calculateScore(500, 5000)).toBe(651);
    expect(calculateScore(1000, 20000)).toBe(465);
  });

  it('ignores the sign of the error', () => {
    expect(calculateScore(-120, 3000)).toBe(calculateScore(120, 3000));
  });

  it('uses sub-millisecond precision so close results still separate', () => {
    expect(calculateScore(46.71, 3200)).toBeGreaterThan(0);
    expect(calculateScore(46.71, 3200)).not.toBe(calculateScore(49.99, 3200));
  });
});

describe('streaks', () => {
  it('extends only for errors within the threshold', () => {
    expect(continuesStreak(50)).toBe(true);
    expect(continuesStreak(100)).toBe(true);
    expect(continuesStreak(101)).toBe(false);
    expect(continuesStreak(-80)).toBe(true);
  });

  it('pays nothing for the first hit and grows in capped steps', () => {
    expect(calculateStreakBonus(1)).toBe(0);
    expect(calculateStreakBonus(2)).toBe(25);
    expect(calculateStreakBonus(3)).toBe(50);
    expect(calculateStreakBonus(7)).toBe(150);
    expect(calculateStreakBonus(50)).toBe(150);
  });

  it('keeps the bonus small relative to a round score', () => {
    expect(calculateStreakBonus(99)).toBeLessThan(calculateScore(0, 5000) / 2);
  });
});
