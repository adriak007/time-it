import { useEffect } from 'react';
import { PLAYER_ACCENTS, RATINGS } from '../config/gameConfig';
import { T } from '../config/strings';
import { audio } from '../services/audio';
import type { RoomState } from '../types/online';
import type { PlayerId } from '../types/game';
import { formatSignedDiff, formatScore, formatTime } from '../utils/time';
import { Label } from './ui';

/** O servidor manda o id da classificação; aqui viramos rótulo traduzido. */
const ratingLabel = (id: string): string =>
  RATINGS.find((r) => r.id === id)?.label ?? '';

interface OnlineRoundResultsProps {
  room: RoomState;
  myId: PlayerId;
}

/** Ranking da rodada, já ordenado pelo servidor por proximidade do alvo. */
export const OnlineRoundResults = ({ room, myId }: OnlineRoundResultsProps) => {
  const results = room.results ?? [];
  const nameOf = (id: PlayerId) => room.players.find((p) => p.id === id)?.name ?? '';

  useEffect(() => {
    audio.play('roundWinner');
  }, []);

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
      <div className="flex flex-col items-center gap-1">
        <Label>{T.common.target}</Label>
        <div className="tabular text-[clamp(2.2rem,11vmin,3.2rem)] leading-none font-black text-brand">
          {room.targetMs != null ? `${formatTime(room.targetMs)}s` : '—'}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {results.map((r, index) => {
          const mine = r.playerId === myId;
          const first = index === 0;
          return (
            <div
              key={r.playerId}
              className="anim-fade-up flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{
                animationDelay: `${index * 90}ms`,
                background: first ? 'color-mix(in srgb, var(--color-brand) 12%, transparent)' : 'var(--color-surface-2)',
                boxShadow: mine ? '0 0 0 2px var(--color-brand)' : '0 2px 0 var(--color-surface-3)',
              }}
            >
              <span className="tabular w-5 text-lg font-black text-ink-faint">
                {index + 1}
              </span>

              <div className="flex min-w-0 flex-1 flex-col">
                <span
                  className="truncate text-sm font-black tracking-wide"
                  style={{ color: PLAYER_ACCENTS[r.playerId] }}
                >
                  {nameOf(r.playerId)}
                </span>
                <span className="text-[0.6rem] font-black tracking-[0.1em] text-ink-faint">
                  {ratingLabel(r.rating)}
                </span>
              </div>

              <div className="flex flex-col items-end">
                <span className="tabular text-lg leading-tight font-black">
                  {formatTime(r.elapsedMs)}s
                </span>
                <span
                  className="tabular text-xs font-black"
                  style={{
                    color:
                      r.direction === 'early'
                        ? 'var(--color-early)'
                        : r.direction === 'late'
                          ? 'var(--color-late)'
                          : 'var(--color-gold)',
                  }}
                >
                  {formatSignedDiff(r.errorMs)}
                </span>
              </div>

              <span
                className="tabular w-14 text-right text-base font-black"
                style={{
                  color: r.totalPoints > 0 ? 'var(--color-brand)' : 'var(--color-ink-faint)',
                }}
              >
                {r.totalPoints}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <Label>{T.common.total}</Label>
        <div className="grid grid-cols-2 gap-2">
          {[...room.players]
            .sort((a, b) => b.totalScore - a.totalScore)
            .map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2"
              >
                <span
                  className="truncate text-xs font-black"
                  style={{ color: PLAYER_ACCENTS[p.id] }}
                >
                  {p.name}
                </span>
                <span className="tabular text-sm font-black">
                  {formatScore(p.totalScore)}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
