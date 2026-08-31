import { memo, useCallback, useRef, useState } from 'react';
import { T } from '../config/strings';
import type { AttemptStatus, PlayerId } from '../types';

export type TapButtonSize = 'solo' | 'duo' | 'quad';

interface TapButtonProps {
  playerId: PlayerId;
  status: AttemptStatus;
  /** Called on pointerdown, before any visual work happens. */
  onTap: (playerId: PlayerId) => void;
  accent: string;
  label: string;
  showLabel: boolean;
  size?: TapButtonSize;
  disabled?: boolean;
  /** Rotates the content 180° for players sitting opposite the device. */
  flipped?: boolean;
}

const COPY: Record<AttemptStatus, string> = {
  idle: T.game.tapToStart,
  running: T.game.tapToStop,
  finished: T.game.locked,
  invalid: T.game.void,
};

/** Mesma coisa, para quem joga com mouse. */
const COPY_POINTER: Record<AttemptStatus, string> = {
  ...COPY,
  idle: T.game.clickToStart,
  running: T.game.clickToStop,
};

/**
 * The signature control of Time It!
 *
 * Input contract:
 *  - Fires on `pointerdown`, never on click, so the timestamp is taken at
 *    physical contact rather than after the browser's click synthesis.
 *  - Tracks its OWN pointerId. Each button belongs to one finger, so four
 *    players pressing simultaneously never interfere with one another —
 *    there is no shared "pressed" state anywhere in the tree.
 *  - `touch-action: none` prevents scroll/zoom gestures from stealing the
 *    press, and the press animation runs AFTER the handler has already
 *    reported the tap upward.
 */
export const TapButton = memo(function TapButton({
  playerId,
  status,
  onTap,
  accent,
  label,
  showLabel,
  size = 'solo',
  disabled = false,
  flipped = false,
}: TapButtonProps) {
  const [pressed, setPressed] = useState(false);
  const activePointer = useRef<number | null>(null);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (disabled || status === 'finished' || status === 'invalid') return;
      // Ignore a second finger landing on a button that is already held.
      if (activePointer.current !== null) return;

      activePointer.current = event.pointerId;
      // Report the tap FIRST. Everything below is cosmetic.
      onTap(playerId);

      // Capturing keeps this finger bound to this button even if it drifts
      // outside during the press. It throws if the pointer is already gone
      // (a very short tap, or a synthetic event), which must never break the
      // tap that was just registered.
      try {
        event.currentTarget.setPointerCapture?.(event.pointerId);
      } catch {
        /* capture is an enhancement, not a requirement */
      }
      setPressed(true);
    },
    [disabled, onTap, playerId, status],
  );

  const release = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (activePointer.current !== event.pointerId) return;
    activePointer.current = null;
    setPressed(false);
  }, []);

  /** Safety net: if the browser takes the pointer away without a pointerup,
   *  clear the slot so this button never gets stuck ignoring the next tap. */
  const forceRelease = useCallback(() => {
    activePointer.current = null;
    setPressed(false);
  }, []);

  const isRunning = status === 'running';
  const isDone = status === 'finished' || status === 'invalid';
  const isLocked = disabled || isDone;

  /**
   * Profundidade "de brinquedo": o botão é uma tampa colorida apoiada sobre
   * uma parede mais escura. Ao apertar, a tampa desce e a parede encolhe na
   * mesma medida — o conjunto não muda de altura, então nada na tela pula.
   *
   * Sem escala e sem animação em repouso: um botão pulsando seria um ritmo
   * que o jogador poderia usar para contar o tempo.
   */
  const lift = isDone ? 0 : pressed ? 2 : 8;

  const face = isRunning
    ? 'var(--color-surface-2)'
    : isDone
      ? 'var(--color-surface-3)'
      : 'var(--color-brand)';

  const wall = isRunning
    ? 'var(--color-line)'
    : isDone
      ? 'var(--color-line)'
      : 'var(--color-brand-deep)';

  const textTone = isRunning || isDone ? 'text-ink' : 'text-on-brand';

  const fontSize =
    size === 'solo'
      ? 'text-[clamp(1.5rem,7vmin,2.75rem)]'
      : size === 'duo'
        ? 'text-[clamp(1.1rem,4.6vmin,2rem)]'
        : 'text-[clamp(0.9rem,3.4vmin,1.5rem)]';

  // Teto absoluto além das medidas de container: num monitor grande, 94% da
  // altura vira um círculo de mais de 900px — desproporcional e sem graça.
  // No celular o limite nunca é atingido, então nada muda lá.
  const maxDiameter = showLabel ? '20rem' : '26rem';
  const diameter = showLabel
    ? `min(98cqw, 86cqh, ${maxDiameter})`
    : `min(94cqw, 94cqh, ${maxDiameter})`;

  return (
    // Fluxo em coluna (rótulo acima do botão) em vez de posição absoluta:
    // quando a zona é girada para quem está do outro lado da mesa, o rótulo
    // continua colado no próprio botão.
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-1.5"
      style={{ transform: flipped ? 'rotate(180deg)' : undefined }}
    >
      {showLabel && (
        <span
          className="max-w-full truncate px-2 text-[clamp(0.65rem,2.4vmin,0.85rem)] font-extrabold tracking-[0.14em]"
          style={{ color: accent }}
        >
          {label}
        </span>
      )}

      {/* Base: a parede escura que dá a espessura ao botão. */}
      <div
        className="relative shrink-0 rounded-full"
        style={{
          width: diameter,
          height: diameter,
          background: wall,
          // Sombra de contato no chão, curtinha e suave.
          boxShadow: isDone ? 'none' : '0 6px 14px -6px rgba(30,42,53,0.28)',
        }}
      >
        <button
          type="button"
          aria-label={`${label}: ${COPY[status].replace(/\n/g, ' ')}`}
          aria-disabled={isLocked}
          onPointerDown={handlePointerDown}
          onPointerUp={release}
          onPointerCancel={release}
          onLostPointerCapture={forceRelease}
          onPointerLeave={release}
          onContextMenu={(e) => e.preventDefault()}
          className={[
            'no-touch-callout absolute inset-x-0 top-0 flex items-center justify-center',
            'rounded-full transition-[transform] duration-75 ease-out select-none',
            textTone,
            isLocked ? 'cursor-default' : 'cursor-pointer',
          ].join(' ')}
          style={{
            height: '100%',
            background: face,
            touchAction: 'none',
            // A tampa sobe `lift` acima da parede; apertar reduz o valor.
            transform: `translateY(-${lift}px)`,
            // Brilho interno no topo: dá volume sem parecer glossy antigo.
            boxShadow: isDone
              ? 'none'
              : 'inset 0 3px 0 rgba(255,255,255,0.28), inset 0 -2px 0 rgba(0,0,0,0.06)',
            outline: isRunning ? `3px solid ${accent}` : undefined,
            outlineOffset: isRunning ? '-3px' : undefined,
          }}
        >
          {/* As duas versões existem no DOM e o CSS escolhe qual mostrar
              (`pointer: fine` = mouse). Sem JavaScript e sem re-render: o
              rótulo não pode depender de estado durante uma tentativa. */}
          <span
            className={`whitespace-pre-line px-3 text-center leading-[1.1] font-black tracking-tight ${fontSize}`}
          >
            {isDone ? (
              status === 'invalid' ? (
                T.game.void
              ) : (
                '✓'
              )
            ) : (
              <>
                <span className="touch-copy">{COPY[status]}</span>
                <span className="pointer-copy">{COPY_POINTER[status]}</span>
              </>
            )}
          </span>
        </button>
      </div>
    </div>
  );
});
