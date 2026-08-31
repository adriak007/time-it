import { describe, expect, it } from 'vitest';
import { createSeededRandom } from '../../services/random';
import { defaultPlayerName } from '../../config/gameConfig';
import type { GameConfigInput } from '../../types';
import {
  allAttemptsResolved,
  anyAttemptRunning,
  applyRoundToPlayers,
  createRound,
  createSession,
  isLastRound,
  playerIds,
  resolveAttempt,
} from '../session';

const config = (overrides: Partial<GameConfigInput> = {}): GameConfigInput => ({
  players: 2,
  playerNames: [0, 1, 2, 3].map(defaultPlayerName),
  minTargetMs: 1000,
  maxTargetMs: 10000,
  stepMs: 100,
  rounds: 5,
  ...overrides,
});

describe('createSession', () => {
  it('starts in the round intro with one round and a target on the grid', () => {
    const session = createSession(config(), createSeededRandom(1));
    expect(session.phase).toBe('round_intro');
    expect(session.rounds).toHaveLength(1);
    expect((session.rounds[0].targetMs - 1000) % 100).toBe(0);
  });

  it('creates one player per configured slot, with an idle attempt each', () => {
    const session = createSession(config({ players: 4 }), createSeededRandom(1));
    expect(session.players.map((p) => p.id)).toEqual([1, 2, 3, 4]);
    expect(Object.values(session.rounds[0].attempts)).toHaveLength(4);
    expect(Object.values(session.rounds[0].attempts).every((a) => a.status === 'idle')).toBe(true);
  });

  it('falls back to a default name when the configured name is blank', () => {
    const session = createSession(
      config({ players: 2, playerNames: ['  ', 'ANA'] }),
      createSeededRandom(1),
    );
    expect(session.players[0].name).toBe(defaultPlayerName(0));
    expect(session.players[1].name).toBe('ANA');
  });
});

describe('round progression', () => {
  it('knows when the final round is reached', () => {
    const session = createSession(config({ rounds: 3 }), createSeededRandom(1));
    expect(isLastRound({ ...session, roundIndex: 1 })).toBe(false);
    expect(isLastRound({ ...session, roundIndex: 2 })).toBe(true);
  });

  it('never reports a last round in endless mode', () => {
    const session = createSession(config({ rounds: 'endless' }), createSeededRandom(1));
    expect(isLastRound({ ...session, roundIndex: 99 })).toBe(false);
  });

  it('avoids repeating the previous target between rounds', () => {
    const cfg = config({ minTargetMs: 1000, maxTargetMs: 2000, stepMs: 500 });
    for (let i = 0; i < 50; i += 1) {
      expect(createRound(1, cfg, 1500, createSeededRandom(i)).targetMs).not.toBe(1500);
    }
  });
});

describe('attempt resolution', () => {
  const round = createRound(0, config(), null, createSeededRandom(5));

  it('scores a late stop and records the direction', () => {
    const { attempt } = resolveAttempt(round.attempts[1], 3270, 3200, 0);
    expect(attempt.status).toBe('finished');
    expect(attempt.errorMs).toBeCloseTo(70);
    expect(attempt.absErrorMs).toBeCloseTo(70);
    expect(attempt.direction).toBe('late');
    expect(attempt.rating).toBe('great');
    expect(attempt.score).toBeGreaterThan(0);
  });

  it('scores an early stop', () => {
    const { attempt } = resolveAttempt(round.attempts[1], 3120, 3200, 0);
    expect(attempt.direction).toBe('early');
    expect(attempt.errorMs).toBeCloseTo(-80);
  });

  it('awards the maximum for an exact stop', () => {
    const { attempt } = resolveAttempt(round.attempts[1], 3200, 3200, 0);
    expect(attempt.direction).toBe('exact');
    expect(attempt.rating).toBe('impossible');
    expect(attempt.score).toBe(1000);
  });

  it('preserves sub-millisecond precision so near-identical results differ', () => {
    const a = resolveAttempt(round.attempts[1], 3246.71, 3200, 0).attempt;
    const b = resolveAttempt(round.attempts[1], 3249.99, 3200, 0).attempt;
    expect(a.elapsedMs).toBe(3246.71);
    expect(a.absErrorMs).not.toBe(b.absErrorMs);
  });

  it('extends a streak within the threshold and adds a capped bonus', () => {
    const { attempt, newStreak } = resolveAttempt(round.attempts[1], 3250, 3200, 1);
    expect(newStreak).toBe(2);
    expect(attempt.streakBonus).toBe(25);
    expect(attempt.totalPoints).toBe(attempt.score + 25);
  });

  it('keeps the base score within 0-1000 even on a streak', () => {
    // A near-perfect stop on a long streak: the bonus must sit on top of the
    // base score rather than inflating it past the documented maximum.
    const { attempt } = resolveAttempt(round.attempts[1], 3200, 3200, 8);
    expect(attempt.score).toBe(1000);
    expect(attempt.score).toBeLessThanOrEqual(1000);
    expect(attempt.streakBonus).toBe(150);
    expect(attempt.totalPoints).toBe(1150);
  });

  it('breaks the streak on a wide miss and pays no bonus', () => {
    const { attempt, newStreak } = resolveAttempt(round.attempts[1], 4000, 3200, 4);
    expect(newStreak).toBe(0);
    expect(attempt.streakBonus).toBe(0);
  });
});

describe('round state helpers', () => {
  it('detects a running attempt and a fully resolved round', () => {
    const round = createRound(0, config(), null, createSeededRandom(3));
    expect(allAttemptsResolved(round, 2)).toBe(false);

    round.attempts[1] = { ...round.attempts[1], status: 'running' };
    expect(anyAttemptRunning(round, 2)).toBe(true);

    round.attempts[1] = { ...round.attempts[1], status: 'finished' };
    round.attempts[2] = { ...round.attempts[2], status: 'finished' };
    expect(allAttemptsResolved(round, 2)).toBe(true);
    expect(anyAttemptRunning(round, 2)).toBe(false);
  });

  it('counts an invalidated attempt as resolved so the round can advance', () => {
    const round = createRound(0, config(), null, createSeededRandom(3));
    round.attempts[1] = { ...round.attempts[1], status: 'invalid' };
    round.attempts[2] = { ...round.attempts[2], status: 'finished' };
    expect(allAttemptsResolved(round, 2)).toBe(true);
  });
});

describe('applyRoundToPlayers', () => {
  it('accumulates score, error and precision hits', () => {
    const session = createSession(config(), createSeededRandom(9));
    const round = session.rounds[0];
    round.attempts[1] = resolveAttempt(round.attempts[1], round.targetMs + 20, round.targetMs, 0)
      .attempt;
    round.attempts[2] = resolveAttempt(round.attempts[2], round.targetMs + 600, round.targetMs, 0)
      .attempt;

    const [p1, p2] = applyRoundToPlayers(session.players, round);
    expect(p1.totalScore).toBe(round.attempts[1].score);
    expect(p1.precisionHits).toBe(1);
    expect(p2.precisionHits).toBe(0);
    expect(p2.totalAbsErrorMs).toBeCloseTo(600);
  });

  it('leaves a player untouched when their attempt was invalidated', () => {
    const session = createSession(config(), createSeededRandom(9));
    const round = session.rounds[0];
    round.attempts[1] = { ...round.attempts[1], status: 'invalid' };
    const [p1] = applyRoundToPlayers(session.players, round);
    expect(p1.totalScore).toBe(0);
  });
});

describe('playerIds', () => {
  it('produces the ids for each supported player count', () => {
    expect(playerIds(1)).toEqual([1]);
    expect(playerIds(4)).toEqual([1, 2, 3, 4]);
  });
});
