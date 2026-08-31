import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Arena } from '../components/Arena';
import { RoundIntro } from '../components/RoundIntro';
import { RoundResults } from '../components/RoundResults';
import { SoloResult } from '../components/SoloResult';
import { Button, Label, Screen } from '../components/ui';
import { PERFECT_FX_THRESHOLD_MS, TIMING } from '../config/gameConfig';
import { T } from '../config/strings';
import {
  allAttemptsResolved,
  applyRoundToPlayers,
  createRound,
  createSession,
  currentRound,
  isLastRound,
  playerIds,
  resolveAttempt,
  totalRoundsLabel,
} from '../game/session';
import { useAttemptTimer } from '../hooks/useAttemptTimer';
import { useOrientation } from '../hooks/useOrientation';
import { useVisibilityGuard } from '../hooks/useVisibilityGuard';
import { audio } from '../services/audio';
import { hapticStart, hapticStop } from '../services/haptics';
import { comparePlayers } from '../services/ranking';
import type { GameConfigInput, GameSession, PlayerId, Stats } from '../types';
import { formatTime } from '../utils/time';

interface GamePageProps {
  config: GameConfigInput;
  reduceMotion: boolean;
  onExit: () => void;
  onFinish: (session: GameSession) => void;
  onRecordAttempts: (updater: (stats: Stats) => Stats) => void;
}

/**
 * The gameplay orchestrator.
 *
 * Timing rule enforced here: while an attempt is RUNNING, this component does
 * not re-render on a schedule and holds no elapsed value in state. The only
 * state changes during an attempt are the button status flags, set once at the
 * start tap and once at the stop tap. Nothing on screen can reveal the clock.
 */
export const GamePage = ({
  config,
  reduceMotion,
  onExit,
  onFinish,
  onRecordAttempts,
}: GamePageProps) => {
  const [session, setSession] = useState<GameSession>(() => createSession(config));
  const timer = useAttemptTimer();
  const landscape = useOrientation();
  const revealTimeout = useRef<number | null>(null);
  const statsRecorded = useRef(new Set<number>());

  const round = currentRound(session);
  const soloMode = config.players === 1;
  const phase = session.phase;

  /* ---------------------------------------------------------------- */
  /* Body lock: no scroll, no selection, no zoom while playing.        */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    document.body.classList.add('playing');
    return () => document.body.classList.remove('playing');
  }, []);

  useEffect(
    () => () => {
      if (revealTimeout.current) window.clearTimeout(revealTimeout.current);
    },
    [],
  );

  /* ---------------------------------------------------------------- */
  /* Input handling                                                   */
  /* ---------------------------------------------------------------- */

  const handleTap = useCallback(
    (playerId: PlayerId) => {
      setSession((prev) => {
        if (prev.phase !== 'playing') return prev;

        const active = prev.rounds[prev.roundIndex];
        const attempt = active.attempts[playerId];

        /* ---- First tap: start this player's timer ---- */
        if (attempt.status === 'idle') {
          const startedAt = timer.start(playerId);
          if (startedAt == null) return prev;
          hapticStart();
          audio.play('start');

          const rounds = [...prev.rounds];
          rounds[prev.roundIndex] = {
            ...active,
            attempts: {
              ...active.attempts,
              [playerId]: { ...attempt, status: 'running', startedAt },
            },
          };
          return { ...prev, rounds };
        }

        /* ---- Second tap: stop and score ---- */
        if (attempt.status === 'running') {
          const elapsed = timer.stop(playerId);
          // null means the guard rejected it: one physical press, two events.
          if (elapsed == null) return prev;
          hapticStop();
          audio.play('stop');

          const player = prev.players.find((p) => p.id === playerId)!;
          const { attempt: resolved, newStreak } = resolveAttempt(
            attempt,
            elapsed,
            active.targetMs,
            player.currentStreak,
          );

          const rounds = [...prev.rounds];
          rounds[prev.roundIndex] = {
            ...active,
            attempts: { ...active.attempts, [playerId]: resolved },
          };

          const players = prev.players.map((p) =>
            p.id === playerId
              ? { ...p, currentStreak: newStreak, bestStreak: Math.max(p.bestStreak, newStreak) }
              : p,
          );

          return { ...prev, rounds, players };
        }

        return prev;
      });
    },
    [timer],
  );

  /* ---------------------------------------------------------------- */
  /* Round completion                                                  */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (session.phase !== 'playing') return;
    // An interrupted round is shown as ROUND INTERRUPTED and waits for RETRY.
    // Without this guard the voided attempt counts as "resolved" and the round
    // would advance straight to the results screen.
    if (session.interrupted) return;
    if (!allAttemptsResolved(round, config.players)) return;

    // Record stats once per round index, even under StrictMode double-invoke.
    if (!statsRecorded.current.has(session.roundIndex)) {
      statsRecorded.current.add(session.roundIndex);

      const finished = playerIds(config.players)
        .map((id) => round.attempts[id])
        .filter((a) => a.status === 'finished' && a.absErrorMs != null);

      if (finished.length > 0) {
        onRecordAttempts((stats) => {
          let next: Stats = { ...stats, roundsPlayed: stats.roundsPlayed + 1 };
          finished.forEach((attempt) => {
            const absError = attempt.absErrorMs!;
            next = {
              ...next,
              totalAbsErrorMs: next.totalAbsErrorMs + absError,
              bestAbsErrorMs:
                next.bestAbsErrorMs == null ? absError : Math.min(next.bestAbsErrorMs, absError),
              perfectHits: next.perfectHits + (absError <= PERFECT_FX_THRESHOLD_MS ? 1 : 0),
              earlyCount: next.earlyCount + (attempt.direction === 'early' ? 1 : 0),
              lateCount: next.lateCount + (attempt.direction === 'late' ? 1 : 0),
            };
          });
          return next;
        });
      }
    }

    // Hold a short beat, then fold the round into the running totals and show
    // the reveal in a single update. The scores are already computed; this
    // delay is purely presentational and never touches the measurement.
    revealTimeout.current = window.setTimeout(() => {
      setSession((prev) => {
        if (prev.phase !== 'playing') return prev;
        return {
          ...prev,
          players: applyRoundToPlayers(prev.players, prev.rounds[prev.roundIndex]),
          phase: 'round_results',
        };
      });
      audio.play('reveal');
    }, TIMING.revealDelayMs);
  }, [session.phase, session.interrupted, session.roundIndex, round, config.players, onRecordAttempts]);

  /* ---------------------------------------------------------------- */
  /* Interruption: losing focus voids any running attempt.            */
  /* ---------------------------------------------------------------- */

  const handleInterrupt = useCallback(() => {
    timer.cancelAll();
    if (revealTimeout.current) {
      window.clearTimeout(revealTimeout.current);
      revealTimeout.current = null;
    }
    setSession((prev) => {
      if (prev.phase !== 'playing') return prev;
      const active = prev.rounds[prev.roundIndex];
      const attempts = { ...active.attempts };
      let touched = false;

      playerIds(prev.config.players).forEach((id) => {
        if (attempts[id].status === 'running') {
          attempts[id] = { ...attempts[id], status: 'invalid' };
          touched = true;
        }
      });

      if (!touched) return prev;
      const rounds = [...prev.rounds];
      rounds[prev.roundIndex] = { ...active, attempts };
      return { ...prev, rounds, interrupted: true };
    });
  }, [timer]);

  useVisibilityGuard(phase === 'playing', handleInterrupt);

  /* ---------------------------------------------------------------- */
  /* Progression                                                       */
  /* ---------------------------------------------------------------- */

  const startPlaying = useCallback(() => {
    setSession((prev) => (prev.phase === 'round_intro' ? { ...prev, phase: 'playing' } : prev));
  }, []);

  const nextRound = useCallback(() => {
    setSession((prev) => {
      if (isLastRound(prev)) return { ...prev, phase: 'game_over' };
      const nextIndex = prev.roundIndex + 1;
      return {
        ...prev,
        roundIndex: nextIndex,
        rounds: [
          ...prev.rounds,
          createRound(nextIndex, prev.config, prev.rounds[prev.roundIndex].targetMs),
        ],
        phase: 'round_intro',
        interrupted: false,
      };
    });
  }, []);

  /** Replay the interrupted round with the SAME target, so a background
   *  switch never re-rolls the difficulty. */
  const retryRound = useCallback(() => {
    timer.cancelAll();
    setSession((prev) => {
      const active = prev.rounds[prev.roundIndex];
      const rounds = [...prev.rounds];
      rounds[prev.roundIndex] = {
        ...createRound(prev.roundIndex, prev.config, null),
        targetMs: active.targetMs,
      };
      return { ...prev, rounds, phase: 'round_intro', interrupted: false };
    });
  }, [timer]);

  const finished = phase === 'game_over';
  useEffect(() => {
    if (finished) onFinish(session);
  }, [finished, onFinish, session]);

  /* ---------------------------------------------------------------- */
  /* Desktop keyboard support                                          */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;

      if (event.code === 'Space' && soloMode && phase === 'playing') {
        event.preventDefault();
        handleTap(1);
        return;
      }
      if (event.code === 'Enter' && phase === 'round_results') {
        event.preventDefault();
        nextRound();
        return;
      }
      if (event.code === 'Escape') {
        event.preventDefault();
        onExit();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleTap, nextRound, onExit, phase, soloMode]);

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  const standings = useMemo(() => [...session.players].sort(comparePlayers), [session.players]);

  if (session.interrupted && phase === 'playing') {
    return (
      <Screen className="items-center justify-center gap-7 px-8 text-center">
        <div className="anim-fade-up flex flex-col items-center gap-3">
          <div className="text-[clamp(1.6rem,8vmin,2.4rem)] font-extrabold tracking-tight text-late">
            {T.game.interrupted}
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-ink-soft">
            {T.game.interruptedBody}
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={retryRound}>{T.game.retry}</Button>
          <Button variant="ghost" onClick={onExit}>
            {T.common.quit}
          </Button>
        </div>
      </Screen>
    );
  }

  return (
    <Screen width="wide">
      {phase !== 'round_intro' && (
        <header className="flex items-center justify-between gap-3 px-5 pt-2 pb-1">
          <button
            type="button"
            onClick={onExit}
            aria-label={T.a11y.quitMatch}
            className="w-14 text-left text-xs font-bold tracking-[0.2em] text-ink-faint"
          >
            {T.common.quit}
          </button>

          {/* During play the target sits in the header bar. In landscape this
              keeps the whole vertical axis available for the tap zones. */}
          {phase === 'playing' ? (
            <div className="flex items-baseline gap-2.5">
              <Label>{T.common.target}</Label>
              <span className="tabular text-[clamp(1.6rem,7vmin,2.6rem)] leading-none font-extrabold text-brand">
                {formatTime(round.targetMs)}s
              </span>
            </div>
          ) : (
            <Label>
              {T.common.round} {session.roundIndex + 1} / {totalRoundsLabel(session)}
            </Label>
          )}

          <span className="tabular w-14 text-right text-[0.65rem] font-bold tracking-[0.16em] text-ink-faint">
            {phase === 'playing' ? `${session.roundIndex + 1}/${totalRoundsLabel(session)}` : ''}
          </span>
        </header>
      )}

      {phase === 'round_intro' && (
        <RoundIntro
          roundNumber={session.roundIndex + 1}
          totalRounds={totalRoundsLabel(session)}
          targetMs={round.targetMs}
          onComplete={startPlaying}
        />
      )}

      {phase === 'playing' && (
        <>
          <Arena
            round={round}
            playerCount={config.players}
            playerNames={session.players.map((p) => p.name)}
            onTap={handleTap}
            locked={false}
            landscape={landscape}
          />

          {/* Atalho de teclado: só aparece onde existe mouse/teclado, e só
              no modo solo, que é o único com suporte a SPACE. */}
          {soloMode && (
            <p className="desktop-only pb-4 text-center text-xs font-bold text-ink-faint">
              {T.game.keyHintStart} <span className="keycap">{T.game.keySpace}</span>
            </p>
          )}
        </>
      )}

      {phase === 'round_results' && (
        <>
          {soloMode ? (
            <SoloResult
              attempt={round.attempts[1]}
              targetMs={round.targetMs}
              streak={session.players[0].currentStreak}
              reduceMotion={reduceMotion}
            />
          ) : (
            <RoundResults round={round} players={session.players} standings={standings} />
          )}

          <div className="flex justify-center px-6 pt-2 pb-5">
            <Button size="lg" onClick={nextRound} className="w-full max-w-sm">
              {isLastRound(session) ? T.game.seeResults : T.game.nextRound}
            </Button>
          </div>
        </>
      )}
    </Screen>
  );
};
