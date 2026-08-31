import type { Player, PlayerAttempt, StandingEntry } from '../types';

/**
 * Ordering rules, applied in sequence:
 *   1. Higher total score wins.
 *   2. Tie -> lower cumulative absolute error wins (steadier player).
 *   3. Still tied -> more precision hits (PERFECT/AMAZING tier) wins.
 *   4. Still tied -> a genuine draw; both share the rank.
 */
export const comparePlayers = (a: Player, b: Player): number => {
  if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
  if (a.totalAbsErrorMs !== b.totalAbsErrorMs) return a.totalAbsErrorMs - b.totalAbsErrorMs;
  if (b.precisionHits !== a.precisionHits) return b.precisionHits - a.precisionHits;
  return a.id - b.id; // stable, deterministic display order for a true draw
};

/** True when neither player can be separated by any tiebreak criterion. */
export const isDraw = (a: Player, b: Player): boolean =>
  a.totalScore === b.totalScore &&
  a.totalAbsErrorMs === b.totalAbsErrorMs &&
  a.precisionHits === b.precisionHits;

/**
 * Final standings. Drawn players share a rank number, and the next distinct
 * player's rank skips accordingly (1, 1, 3 — never 1, 1, 2).
 */
export const buildStandings = (players: Player[]): StandingEntry[] => {
  const sorted = [...players].sort(comparePlayers);
  const entries: StandingEntry[] = [];

  sorted.forEach((player, index) => {
    const previous = index > 0 ? sorted[index - 1] : null;
    const drawnWithPrevious = previous != null && isDraw(previous, player);
    const rank = drawnWithPrevious ? entries[index - 1].rank : index + 1;
    entries.push({ player, rank, tied: drawnWithPrevious });
  });

  // Back-fill `tied` onto the first member of each drawn group.
  entries.forEach((entry, index) => {
    const next = entries[index + 1];
    if (next && next.rank === entry.rank) entry.tied = true;
  });

  return entries;
};

/** Winners of a finished match — more than one entry means a shared victory. */
export const getWinners = (standings: StandingEntry[]): StandingEntry[] =>
  standings.filter((entry) => entry.rank === 1);

/**
 * Round ranking: closest attempt first. Invalid/unfinished attempts sink to
 * the bottom rather than being dropped, so every player stays visible.
 */
export const rankRoundAttempts = (attempts: PlayerAttempt[]): PlayerAttempt[] =>
  [...attempts].sort((a, b) => {
    const aDone = a.status === 'finished' && a.absErrorMs != null;
    const bDone = b.status === 'finished' && b.absErrorMs != null;
    if (aDone !== bDone) return aDone ? -1 : 1;
    if (!aDone || !bDone) return a.playerId - b.playerId;
    if (a.absErrorMs !== b.absErrorMs) return a.absErrorMs! - b.absErrorMs!;
    return a.playerId - b.playerId;
  });
