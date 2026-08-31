import { useState } from 'react';
import { Button, Card, Label, OptionRow, Screen } from '../components/ui';
import { PLAYER_ACCENTS, ROUND_OPTIONS, STEP_OPTIONS } from '../config/gameConfig';
import { T } from '../config/strings';
import { online } from '../services/online';
import type { RoomState } from '../types/online';
import type { PlayerId, RoundsSetting } from '../types/game';
import { formatTimeCompact } from '../utils/time';

interface OnlineLobbyPageProps {
  room: RoomState;
  myId: PlayerId | null;
  onLeave: () => void;
}

/**
 * Sala de espera: mostra o código para convidar, quem já entrou, e deixa o
 * anfitrião ajustar as opções antes de começar.
 */
export const OnlineLobbyPage = ({ room, myId, onLeave }: OnlineLobbyPageProps) => {
  const [copied, setCopied] = useState(false);
  const isHost = room.players.find((p) => p.id === myId)?.isHost ?? false;
  const canStart = isHost && room.players.filter((p) => p.connected).length >= 2;

  /** Compartilha pelo app nativo quando disponível; senão copia o código. */
  const share = async () => {
    const text = T.online.shareText(room.code);
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Time It!', text });
        return;
      }
    } catch {
      /* usuário cancelou — cai para a cópia */
    }
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* sem permissão de área de transferência: o código já está na tela */
    }
  };

  return (
    <Screen>
      <header className="flex items-center justify-between px-5 pt-4 pb-2">
        <button
          type="button"
          onClick={onLeave}
          className="text-xs font-black tracking-[0.12em] text-ink-faint"
        >
          {T.common.back}
        </button>
        <span className="text-sm font-black tracking-[0.12em]">{T.online.lobby}</span>
        <div className="w-10" />
      </header>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-4">
        {/* Código da sala: o item mais importante da tela. */}
        <Card className="flex flex-col items-center gap-2 py-6">
          <Label>{T.online.codeLabel}</Label>
          <div className="tabular text-[clamp(2.8rem,16vmin,4.5rem)] leading-none font-black tracking-[0.15em] text-brand">
            {room.code}
          </div>
          <Button variant="secondary" size="sm" onClick={share} className="mt-2">
            {copied ? T.online.shareCopied : T.online.share}
          </Button>
        </Card>

        <div className="flex flex-col gap-2">
          <Label>{T.online.playersCount(room.players.length)}</Label>
          {room.players.map((player) => (
            <div
              key={player.id}
              className="flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3"
              style={{ boxShadow: '0 2px 0 var(--color-surface-3)' }}
            >
              <span
                className="h-3.5 w-3.5 shrink-0 rounded-full"
                style={{
                  background: PLAYER_ACCENTS[player.id],
                  opacity: player.connected ? 1 : 0.3,
                }}
              />
              {/* Cor explícita: sem isso o nome herda a cor do contexto e some
                  sobre o fundo claro. */}
              <span className="flex-1 truncate text-base font-black tracking-wide text-ink">
                {player.name}
              </span>
              {player.id === myId && (
                <span className="text-[0.6rem] font-black tracking-[0.1em] text-brand">
                  {T.online.youLabel}
                </span>
              )}
              {player.isHost && (
                <span className="text-[0.6rem] font-black tracking-[0.1em] text-ink-faint">
                  {T.online.hostLabel}
                </span>
              )}
              {!player.connected && (
                <span className="text-[0.6rem] font-black tracking-[0.1em] text-late">
                  {T.online.offline}
                </span>
              )}
            </div>
          ))}

          {room.players.length < 4 && (
            <div className="rounded-2xl border-2 border-dashed border-line px-4 py-3 text-center text-sm font-bold text-ink-faint">
              {T.online.waiting}
            </div>
          )}
        </div>

        {/* Só o anfitrião edita; os demais veem as opções escolhidas. */}
        <Card className="flex flex-col gap-3">
          <Label>{T.custom.rounds}</Label>
          {isHost ? (
            <OptionRow
              options={ROUND_OPTIONS}
              value={room.config.rounds}
              onChange={(rounds: RoundsSetting) =>
                online.updateConfig({ ...room.config, rounds })
              }
              format={(v) => (v === 'endless' ? '∞' : String(v))}
              columns={4}
            />
          ) : (
            <span className="text-lg font-black">
              {room.config.rounds === 'endless' ? '∞' : room.config.rounds}
            </span>
          )}
        </Card>

        <Card className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <Label>{T.custom.step}</Label>
            <span className="tabular shrink-0 text-[0.65rem] font-bold text-ink-faint">
              {formatTimeCompact(room.config.minTargetMs)} –{' '}
              {formatTimeCompact(room.config.maxTargetMs)}
            </span>
          </div>
          {isHost ? (
            <OptionRow
              options={STEP_OPTIONS}
              value={room.config.stepMs}
              onChange={(stepMs) => online.updateConfig({ ...room.config, stepMs })}
              format={formatTimeCompact}
              columns={4}
            />
          ) : (
            <span className="text-lg font-black">
              {formatTimeCompact(room.config.stepMs)}
            </span>
          )}
        </Card>
      </div>

      <div className="flex flex-col gap-2.5 px-5 pb-7">
        <Button
          size="lg"
          onClick={() => online.start()}
          disabled={!canStart}
          className="w-full"
        >
          {T.online.startMatch}
        </Button>
        <p className="text-center text-xs font-bold text-ink-faint">
          {!isHost
            ? T.online.onlyHostStarts
            : room.players.length < 2
              ? T.online.needPlayers
              : ''}
        </p>
      </div>
    </Screen>
  );
};
