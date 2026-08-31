import { useCallback, useEffect, useRef, useState } from 'react';
import { RoundIntro } from '../components/RoundIntro';
import { TapButton } from '../components/TapButton';
import { Button, Label, Screen } from '../components/ui';
import { OnlineRoundResults } from '../components/OnlineRoundResults';
import { PLAYER_ACCENTS, TIMING } from '../config/gameConfig';
import { T } from '../config/strings';
import { audio } from '../services/audio';
import { hapticStart, hapticStop } from '../services/haptics';
import { online } from '../services/online';
import type { RoomState } from '../types/online';
import type { AttemptStatus, PlayerId } from '../types/game';
import { formatTime } from '../utils/time';

interface OnlineGamePageProps {
  room: RoomState;
  myId: PlayerId;
  onLeave: () => void;
}

/**
 * Partida online.
 *
 * Regra de ouro do timing: o intervalo é medido AQUI, no aparelho do jogador,
 * com `performance.now()`. A rede nunca entra na conta — ela só transporta o
 * resultado. Assim, latência alta atrasa a exibição, jamais a medição.
 *
 * O servidor é a fonte de verdade do resto: alvo, pontuação e ordem chegam
 * prontos e esta tela apenas reflete.
 */
export const OnlineGamePage = ({ room, myId, onLeave }: OnlineGamePageProps) => {
  /** Instante do primeiro toque. Em ref: não re-renderiza durante a corrida. */
  const startedAt = useRef<number | null>(null);
  const [running, setRunning] = useState(false);
  /** Trava local imediata, para o botão responder antes do servidor confirmar. */
  const [sent, setSent] = useState(false);

  const me = room.players.find((p) => p.id === myId);
  const isHost = me?.isHost ?? false;
  const alreadySubmitted = room.submitted.includes(myId) || sent;

  /* Sem rolagem nem seleção durante a partida. */
  useEffect(() => {
    document.body.classList.add('playing');
    return () => document.body.classList.remove('playing');
  }, []);

  const handleTap = useCallback(() => {
    if (room.phase !== 'playing' || alreadySubmitted) return;

    if (startedAt.current == null) {
      // Primeiro toque: marca o instante ANTES de qualquer trabalho visual.
      startedAt.current = performance.now();
      hapticStart();
      audio.play('start');
      setRunning(true);
      return;
    }

    const elapsed = performance.now() - startedAt.current;
    // Mesma proteção do modo local contra um toque físico virar dois eventos.
    if (elapsed < TIMING.minAttemptMs) return;

    hapticStop();
    audio.play('stop');
    setRunning(false);
    setSent(true);
    online.submitAttempt(elapsed);
  }, [room.phase, alreadySubmitted]);

  /* Espaço no desktop, igual ao modo solo. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && room.phase === 'playing' && !e.repeat) {
        e.preventDefault();
        handleTap();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleTap, room.phase]);

  /* ---------------------------------------------------------------- */
  /* Intro da rodada                                                   */
  /* ---------------------------------------------------------------- */

  if (room.phase === 'round_intro' && room.targetMs != null) {
    return (
      <Screen>
        <RoundIntro
          roundNumber={room.roundIndex + 1}
          totalRounds={room.config.rounds === 'endless' ? '∞' : String(room.config.rounds)}
          targetMs={room.targetMs}
          // A contagem aqui é puramente visual: quem libera os botões é o
          // servidor, ao mudar a fase para 'playing'. Assim todos começam no
          // mesmo instante real, sem depender do relógio de cada aparelho —
          // `startsInMs` chega como duração justamente por isso.
          onComplete={() => undefined}
        />
      </Screen>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Resultados da rodada                                              */
  /* ---------------------------------------------------------------- */

  if (room.phase === 'round_results' && room.results) {
    const last = room.config.rounds !== 'endless' && room.roundIndex >= room.config.rounds - 1;
    return (
      <Screen>
        <OnlineRoundResults room={room} myId={myId} />
        <div className="flex flex-col gap-2 px-6 pt-2 pb-6">
          {isHost ? (
            <Button size="lg" onClick={() => online.nextRound()} className="w-full">
              {last ? T.game.seeResults : T.game.nextRound}
            </Button>
          ) : (
            <p className="py-4 text-center text-sm font-bold text-ink-soft">
              {T.online.waitingOthers}
            </p>
          )}
        </div>
      </Screen>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Jogando                                                           */
  /* ---------------------------------------------------------------- */

  const status: AttemptStatus = alreadySubmitted ? 'finished' : running ? 'running' : 'idle';

  return (
    <Screen>
      <header className="flex items-center justify-between gap-3 px-5 pt-2 pb-1">
        <button
          type="button"
          onClick={onLeave}
          aria-label={T.a11y.quitMatch}
          className="w-14 text-left text-xs font-black tracking-[0.12em] text-ink-faint"
        >
          {T.common.quit}
        </button>
        <div className="flex items-baseline gap-2.5">
          <Label>{T.common.target}</Label>
          <span className="tabular text-[clamp(1.6rem,7vmin,2.6rem)] leading-none font-black text-brand">
            {room.targetMs != null ? `${formatTime(room.targetMs)}s` : '—'}
          </span>
        </div>
        <span className="tabular w-14 text-right text-[0.65rem] font-black tracking-[0.1em] text-ink-faint">
          {room.roundIndex + 1}/{room.config.rounds === 'endless' ? '∞' : room.config.rounds}
        </span>
      </header>

      {/* Quem já jogou nesta rodada — sem revelar nenhum tempo. */}
      <div className="flex justify-center gap-2 px-5 py-2">
        {room.players.map((p) => {
          const done = room.submitted.includes(p.id);
          return (
            <div
              key={p.id}
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
              style={{
                background: done ? 'var(--color-surface-2)' : 'transparent',
                opacity: p.connected ? 1 : 0.4,
              }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: PLAYER_ACCENTS[p.id] }}
              />
              <span className="max-w-[5rem] truncate text-[0.65rem] font-black text-ink-soft">
                {p.name}
              </span>
              {done && <span className="text-[0.65rem] text-brand">✓</span>}
            </div>
          );
        })}
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center p-2">
        <div
          className="flex h-full w-full items-center justify-center"
          style={{ containerType: 'size' }}
        >
          <TapButton
            playerId={myId}
            status={status}
            onTap={handleTap}
            accent={PLAYER_ACCENTS[myId]}
            label={me?.name ?? ''}
            showLabel={false}
            size="solo"
            disabled={room.phase !== 'playing'}
          />
        </div>
      </div>

      {alreadySubmitted && (
        <p className="pb-4 text-center text-sm font-black text-ink-soft">
          {T.online.waitingOthers}
        </p>
      )}
    </Screen>
  );
};
