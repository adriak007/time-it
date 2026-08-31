import { useEffect, useMemo } from 'react';
import { Button, Confetti, Label, Screen } from '../components/ui';
import { PLAYER_ACCENTS } from '../config/gameConfig';
import { T } from '../config/strings';
import { audio } from '../services/audio';
import { online } from '../services/online';
import type { RoomState } from '../types/online';
import type { PlayerId } from '../types/game';
import { formatScore, formatTime } from '../utils/time';

const ORDINALS = ['1º', '2º', '3º', '4º'];

interface OnlineGameOverPageProps {
  room: RoomState;
  myId: PlayerId;
  reduceMotion: boolean;
  onLeave: () => void;
}

export const OnlineGameOverPage = ({
  room,
  myId,
  reduceMotion,
  onLeave,
}: OnlineGameOverPageProps) => {
  const isHost = room.players.find((p) => p.id === myId)?.isHost ?? false;

  /** Mesmos critérios de desempate do modo local. */
  const standings = useMemo(
    () =>
      [...room.players].sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        if (a.totalAbsErrorMs !== b.totalAbsErrorMs) {
          return a.totalAbsErrorMs - b.totalAbsErrorMs;
        }
        if (b.precisionHits !== a.precisionHits) return b.precisionHits - a.precisionHits;
        return a.id - b.id;
      }),
    [room.players],
  );

  const roundsPlayed = room.config.rounds === 'endless' ? room.roundIndex + 1 : room.config.rounds;
  const top = standings[0];
  const drawn = standings.filter(
    (p) =>
      p.totalScore === top.totalScore &&
      p.totalAbsErrorMs === top.totalAbsErrorMs &&
      p.precisionHits === top.precisionHits,
  );
  const isDraw = drawn.length > 1;
  const iWon = !isDraw && top.id === myId;

  useEffect(() => {
    audio.play('gameWinner');
  }, []);

  return (
    <Screen width="wide">
      {!reduceMotion && iWon && <Confetti pieces={34} />}

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 pt-8 pb-4">
        <div className="anim-fade-up flex flex-col items-center gap-2 text-center">
          <Label>{T.gameOver.multiTitle}</Label>
          <div className="text-[clamp(1.6rem,9vmin,2.6rem)] leading-tight font-black tracking-tight text-brand">
            {isDraw ? T.gameOver.draw : `${top.name} ${T.gameOver.winsSuffix}`}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {standings.map((player, index) => {
            const first = index === 0 && !isDraw;
            const mine = player.id === myId;
            return (
              <div
                key={player.id}
                className="anim-fade-up flex items-center gap-3 rounded-2xl px-4 py-3.5"
                style={{
                  animationDelay: `${index * 100}ms`,
                  background: first
                    ? 'color-mix(in srgb, var(--color-brand) 12%, transparent)'
                    : 'var(--color-surface-2)',
                  boxShadow: mine
                    ? '0 0 0 2px var(--color-brand)'
                    : '0 2px 0 var(--color-surface-3)',
                }}
              >
                <span
                  className="w-8 text-sm font-black"
                  style={{ color: first ? 'var(--color-brand)' : 'var(--color-ink-faint)' }}
                >
                  {ORDINALS[index] ?? `${index + 1}º`}
                </span>

                <div className="flex min-w-0 flex-1 flex-col">
                  <span
                    className="truncate text-base font-black tracking-wide"
                    style={{ color: PLAYER_ACCENTS[player.id] }}
                  >
                    {player.name}
                  </span>
                  <span className="tabular text-[0.6rem] font-black tracking-[0.1em] text-ink-faint">
                    {T.gameOver.avgError}{' '}
                    {roundsPlayed > 0
                      ? `${formatTime(player.totalAbsErrorMs / roundsPlayed)}s`
                      : '—'}
                  </span>
                </div>

                <span className="tabular text-xl font-black">
                  {formatScore(player.totalScore)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 px-6 pb-7">
        {isHost && (
          <Button size="lg" onClick={() => online.playAgain()} className="w-full">
            {T.gameOver.playAgain}
          </Button>
        )}
        <Button variant="secondary" onClick={onLeave} className="w-full">
          {T.online.leaveRoom}
        </Button>
      </div>
    </Screen>
  );
};
