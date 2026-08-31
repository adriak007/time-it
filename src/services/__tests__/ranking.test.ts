import { describe, expect, it } from 'vitest';
import type { Player, PlayerAttempt, PlayerId } from '../../types';
import { buildStandings, comparePlayers, getWinners, isDraw, rankRoundAttempts } from '../ranking';

const player = (
  id: PlayerId,
  totalScore: number,
  totalAbsErrorMs = 0,
  precisionHits = 0,
): Player => ({
  id,
  name: `PLAYER ${id}`,
  totalScore,
  totalAbsErrorMs,
  precisionHits,
  currentStreak: 0,
  bestStreak: 0,
});

const attempt = (playerId: PlayerId, absErrorMs: number | null): PlayerAttempt => ({
  playerId,
  status: absErrorMs == null ? 'invalid' : 'finished',
  startedAt: 0,
  elapsedMs: absErrorMs == null ? null : 1000 + absErrorMs,
  errorMs: absErrorMs,
  absErrorMs,
  direction: 'late',
  rating: 'great',
  score: 500,
  streakBonus: 0,
  totalPoints: 500,
});

describe('comparePlayers', () => {
  it('ranks by score first', () => {
    expect(comparePlayers(player(1, 4820), player(2, 4610))).toBeLessThan(0);
  });

  it('breaks a score tie with the lower cumulative error', () => {
    expect(comparePlayers(player(1, 3000, 900), player(2, 3000, 400))).toBeGreaterThan(0);
  });

  it('breaks a further tie with more precision hits', () => {
    expect(comparePlayers(player(1, 3000, 400, 1), player(2, 3000, 400, 3))).toBeGreaterThan(0);
  });

  it('falls back to a stable order for a genuine draw', () => {
    expect(comparePlayers(player(1, 3000, 400, 2), player(2, 3000, 400, 2))).toBeLessThan(0);
    expect(isDraw(player(1, 3000, 400, 2), player(2, 3000, 400, 2))).toBe(true);
  });
});

describe('buildStandings', () => {
  it('orders a four-player match and assigns sequential ranks', () => {
    const standings = buildStandings([
      player(1, 4610, 800),
      player(2, 3950, 1500),
      player(3, 4820, 600),
      player(4, 4130, 1200),
    ]);
    expect(standings.map((s) => s.player.id)).toEqual([3, 1, 4, 2]);
    expect(standings.map((s) => s.rank)).toEqual([1, 2, 3, 4]);
    expect(standings.every((s) => !s.tied)).toBe(true);
  });

  it('shares a rank on a true draw and skips the next rank number', () => {
    const standings = buildStandings([
      player(1, 3000, 400, 2),
      player(2, 3000, 400, 2),
      player(3, 2000, 900, 0),
    ]);
    expect(standings.map((s) => s.rank)).toEqual([1, 1, 3]);
    expect(standings[0].tied).toBe(true);
    expect(standings[1].tied).toBe(true);
    expect(standings[2].tied).toBe(false);
  });

  it('reports every drawn leader as a winner', () => {
    const standings = buildStandings([
      player(1, 3000, 400, 2),
      player(2, 3000, 400, 2),
      player(3, 1000),
    ]);
    expect(getWinners(standings)).toHaveLength(2);
  });

  it('reports a single winner when a tiebreak separates the leaders', () => {
    const standings = buildStandings([player(1, 3000, 900), player(2, 3000, 400)]);
    expect(getWinners(standings)).toHaveLength(1);
    expect(getWinners(standings)[0].player.id).toBe(2);
  });
});

describe('rankRoundAttempts', () => {
  it('sorts by closeness to the target', () => {
    const ranked = rankRoundAttempts([
      attempt(1, 50),
      attempt(2, 300),
      attempt(3, 10),
      attempt(4, 120),
    ]);
    expect(ranked.map((a) => a.playerId)).toEqual([3, 1, 4, 2]);
  });

  it('keeps invalid attempts last instead of dropping them', () => {
    const ranked = rankRoundAttempts([attempt(1, null), attempt(2, 200)]);
    expect(ranked.map((a) => a.playerId)).toEqual([2, 1]);
    expect(ranked).toHaveLength(2);
  });
});
