import { useEffect } from 'react';
import { PLAYER_ACCENTS } from '../config/gameConfig';
import { T } from '../config/strings';
import { audio } from '../services/audio';
import { rankRoundAttempts } from '../services/ranking';
import { getRating } from '../services/scoring';
import type { Player, Round } from '../types';
import { formatSignedDiff, formatScore, formatTime } from '../utils/time';
import { Label } from './ui';

interface RoundResultsProps {
  round: Round;
  players: Player[];
  /** Standings AFTER this round, for the running scoreboard. */
  standings: Player[];
}

/**
 * Multiplayer round summary: who got closest, followed by the running totals.
 * Rows stagger in so the winner reads first without a long pause.
 */
export const RoundResults = ({ round, players, standings }: RoundResultsProps) => {
  const ranked = rankRoundAttempts(players.map((p) => round.attempts[p.id]));
  const nameOf = (id: number) => players.find((p) => p.id === id)?.name ?? `PLAYER ${id}`;

  useEffect(() => {
    audio.play('roundWinner');
  }, []);

  return (
    <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-4">
      <div className="flex flex-col items-center gap-1">
        <Label>{T.common.target}</Label>
        <div className="tabular text-[clamp(2.4rem,12vmin,3.6rem)] leading-none font-extrabold text-brand">
          {formatTime(round.targetMs)}s
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {ranked.map((attempt, index) => {
          const rating = attempt.rating ? getRating(attempt.rating) : null;
          const isWinner = index === 0 && attempt.status === 'finished';
          const accent = PLAYER_ACCENTS[attempt.playerId];

          return (
            <div
              key={attempt.playerId}
              className="anim-fade-up flex items-center gap-3 rounded-2xl border bg-surface px-4 py-3"
              style={{
                animationDelay: `${index * 90}ms`,
                borderColor: isWinner ? 'var(--color-brand)' : 'var(--color-line)',
                background: isWinner ? 'rgba(18,168,84,0.09)' : undefined,
              }}
            >
              <span className="tabular w-6 text-lg font-extrabold text-ink-faint">
                {index + 1}
              </span>

              <div className="flex min-w-0 flex-1 flex-col">
                <span
                  className="truncate text-sm font-bold tracking-wide"
                  style={{ color: accent }}
                >
                  {nameOf(attempt.playerId)}
                </span>
                {rating && attempt.status === 'finished' && (
                  <span className="text-[0.65rem] font-bold tracking-[0.18em] text-ink-faint">
                    {rating.label}
                  </span>
                )}
              </div>

              {attempt.status === 'finished' ? (
                <div className="flex flex-col items-end">
                  <span className="tabular text-lg leading-tight font-extrabold">
                    {formatTime(attempt.elapsedMs ?? 0)}s
                  </span>
                  <span
                    className="tabular text-xs font-bold"
                    style={{
                      color:
                        attempt.direction === 'early'
                          ? 'var(--color-early)'
                          : attempt.direction === 'late'
                            ? 'var(--color-late)'
                            : 'var(--color-gold)',
                    }}
                  >
                    {formatSignedDiff(attempt.errorMs ?? 0)}
                  </span>
                </div>
              ) : (
                <span className="text-xs font-bold tracking-[0.2em] text-ink-faint">{T.game.void}</span>
              )}

              <span
                className="tabular w-16 text-right text-base font-extrabold"
                style={{
                  color: attempt.totalPoints > 0 ? 'var(--color-brand)' : 'var(--color-ink-faint)',
                }}
              >
                {attempt.status === 'finished' ? `${attempt.totalPoints}` : '—'}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 border-t border-line pt-4">
        <Label>{T.common.total}</Label>
        <div className="grid grid-cols-2 gap-2">
          {standings.map((player) => (
            <div
              key={player.id}
              className="flex items-center justify-between rounded-xl border border-line bg-surface-2 px-3 py-2"
            >
              <span
                className="truncate text-xs font-bold"
                style={{ color: PLAYER_ACCENTS[player.id] }}
              >
                {player.name}
              </span>
              <span className="tabular text-sm font-extrabold">
                {formatScore(player.totalScore)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
