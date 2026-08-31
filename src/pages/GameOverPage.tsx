import { useEffect, useMemo } from 'react';
import { Button, Confetti, Label, Screen } from '../components/ui';
import { PLAYER_ACCENTS } from '../config/gameConfig';
import { T } from '../config/strings';
import { audio } from '../services/audio';
import { buildStandings, getWinners } from '../services/ranking';
import type { GameSession } from '../types';
import { formatScore, formatTime } from '../utils/time';

interface GameOverPageProps {
  session: GameSession;
  reduceMotion: boolean;
  onPlayAgain: () => void;
  onNewGame: () => void;
  onMainMenu: () => void;
}

const ORDINALS = ['1st', '2nd', '3rd', '4th'];

export const GameOverPage = ({
  session,
  reduceMotion,
  onPlayAgain,
  onNewGame,
  onMainMenu,
}: GameOverPageProps) => {
  const standings = useMemo(() => buildStandings(session.players), [session.players]);
  const winners = getWinners(standings);
  const solo = session.config.players === 1;
  const isDraw = winners.length > 1;

  useEffect(() => {
    audio.play('gameWinner');
  }, []);

  const roundsPlayed = session.rounds.filter((round) =>
    Object.values(round.attempts).some((a) => a.status === 'finished'),
  ).length;

  return (
    <Screen width="wide">
      {!reduceMotion && <Confetti pieces={34} />}

      <div
        className={`flex flex-1 flex-col gap-6 overflow-y-auto px-6 pt-8 pb-4 ${
          solo ? 'justify-center' : ''
        }`}
      >
        <div className="anim-fade-up flex flex-col items-center gap-2 text-center">
          <Label>{solo ? T.gameOver.soloTitle : T.gameOver.multiTitle}</Label>

          {solo ? (
            <>
              <div className="tabular text-[clamp(3rem,17vmin,5rem)] leading-none font-extrabold text-brand">
                {formatScore(standings[0].player.totalScore)}
              </div>
              <span className="text-xs font-bold tracking-[0.24em] text-ink-faint">
                {T.common.points} {T.gameOver.pointsOver} {roundsPlayed}{' '}
                {roundsPlayed === 1 ? T.gameOver.roundSingular : T.gameOver.roundPlural}
              </span>
            </>
          ) : (
            <div className="text-[clamp(1.8rem,10vmin,3rem)] leading-none font-extrabold tracking-tight text-brand">
              {isDraw ? T.gameOver.draw : `${winners[0].player.name} ${T.gameOver.winsSuffix}`}
            </div>
          )}
        </div>

        {!solo && (
          <div className="flex flex-col gap-2">
            {standings.map((entry, index) => {
              const first = entry.rank === 1;
              return (
                <div
                  key={entry.player.id}
                  className="anim-fade-up flex items-center gap-3 rounded-2xl border px-4 py-3.5"
                  style={{
                    animationDelay: `${index * 100}ms`,
                    borderColor: first ? 'var(--color-brand)' : 'var(--color-line)',
                    background: first ? 'rgba(18,168,84,0.10)' : 'var(--color-surface)',
                  }}
                >
                  <span
                    className="w-9 text-sm font-extrabold"
                    style={{ color: first ? 'var(--color-brand)' : 'var(--color-ink-faint)' }}
                  >
                    {ORDINALS[entry.rank - 1] ?? `${entry.rank}th`}
                  </span>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <span
                      className="truncate text-base font-extrabold tracking-wide"
                      style={{ color: PLAYER_ACCENTS[entry.player.id] }}
                    >
                      {entry.player.name}
                    </span>
                    <span className="tabular text-[0.65rem] font-bold tracking-[0.14em] text-ink-faint">
                      {T.gameOver.avgError}{' '}
                      {roundsPlayed > 0
                        ? `${formatTime(entry.player.totalAbsErrorMs / roundsPlayed)}s`
                        : '—'}
                    </span>
                  </div>

                  <span className="tabular text-xl font-extrabold">
                    {formatScore(entry.player.totalScore)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {solo && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-card border border-line bg-surface p-4">
              <Label>{T.gameOver.bestStreak}</Label>
              <div className="tabular mt-1 text-2xl font-extrabold">
                {standings[0].player.bestStreak}x
              </div>
            </div>
            <div className="rounded-card border border-line bg-surface p-4">
              <Label>{T.gameOver.avgError}</Label>
              <div className="tabular mt-1 text-2xl font-extrabold">
                {roundsPlayed > 0
                  ? `${formatTime(standings[0].player.totalAbsErrorMs / roundsPlayed)}s`
                  : '—'}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2.5 px-6 pb-7">
        <Button size="lg" onClick={onPlayAgain} className="w-full">
          {T.gameOver.playAgain}
        </Button>
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="secondary" size="sm" onClick={onNewGame}>
            {T.gameOver.newGame}
          </Button>
          <Button variant="secondary" size="sm" onClick={onMainMenu}>
            {T.gameOver.mainMenu}
          </Button>
        </div>
      </div>
    </Screen>
  );
};
