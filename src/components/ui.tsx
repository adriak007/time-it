import { useState, type ReactNode } from 'react';
import { audio } from '../services/audio';
import { hapticUI } from '../services/haptics';

/* ------------------------------------------------------------------ */
/* Screen scaffold — applies safe-area padding on every page.          */
/* ------------------------------------------------------------------ */

/**
 * Moldura de todas as telas.
 *
 * No celular ocupa tudo, como antes. No desktop, o conteúdo fica num "palco"
 * centralizado com largura máxima: esticar uma interface pensada para o
 * polegar até 1920px deixa botões enormes com texto minúsculo no meio.
 *
 * O limite é aplicado num wrapper interno, e não no elemento raiz, para que o
 * fundo continue preenchendo a janela inteira.
 */
export const Screen = ({
  children,
  className = '',
  /** Largura do palco no desktop. 'wide' para telas com listas/cartões. */
  width = 'default',
}: {
  children: ReactNode;
  className?: string;
  width?: 'default' | 'wide';
}) => (
  <div className="flex h-full w-full items-center justify-center">
    <div
      className={[
        'flex h-full w-full flex-col',
        width === 'wide' ? 'max-w-[46rem]' : 'max-w-[30rem]',
        // Num monitor alto, uma coluna de 1080px de altura fica esticada e
        // vazia. O teto dá ao jogo proporção de aplicativo, centralizado.
        // Só vale onde há mouse: no celular a tela é sempre preenchida.
        '[@media(pointer:fine)]:max-h-[52rem]',
        className,
      ].join(' ')}
      style={{
        paddingTop: 'var(--safe-top)',
        paddingBottom: 'var(--safe-bottom)',
        paddingLeft: 'var(--safe-left)',
        paddingRight: 'var(--safe-right)',
      }}
    >
      {children}
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';

/** Cada variante é uma dupla: a tampa e a parede escura por baixo dela. */
const VARIANTS: Record<ButtonVariant, { face: string; wall: string; text: string }> = {
  primary: {
    face: 'var(--color-brand)',
    wall: 'var(--color-brand-deep)',
    text: 'var(--color-on-brand)',
  },
  /* Azul do jogador 2: destaca uma ação importante sem disputar atenção
     com o verde do botão principal. */
  accent: {
    face: 'var(--color-early)',
    wall: 'var(--color-early-deep)',
    text: '#ffffff',
  },
  secondary: {
    face: 'var(--color-surface-2)',
    wall: 'var(--color-surface-3)',
    text: 'var(--color-ink)',
  },
  ghost: {
    face: 'var(--color-surface)',
    wall: 'var(--color-line)',
    text: 'var(--color-ink-soft)',
  },
  danger: {
    face: 'var(--color-danger)',
    wall: 'var(--color-danger-deep)',
    text: '#ffffff',
  },
};

/**
 * Botão com profundidade física, no espírito dos jogos casuais: a tampa fica
 * apoiada sobre uma parede colorida mais escura e afunda ao ser pressionada.
 * O bloco todo mantém a mesma altura, então o layout nunca dá um pulo.
 */
export const Button = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
}) => {
  const [pressed, setPressed] = useState(false);
  const { face, wall, text } = VARIANTS[variant];

  const sizing =
    size === 'lg'
      ? 'px-7 py-4.5 text-lg tracking-[0.1em]'
      : size === 'sm'
        // Rótulos em português são mais longos que em inglês: padding e
        // espaçamento apertados para não estourar a largura da coluna.
        ? 'px-2 py-2.5 text-[0.72rem] tracking-[0.04em]'
        : 'px-6 py-3.5 text-sm tracking-[0.08em]';

  const lift = size === 'lg' ? 8 : size === 'sm' ? 4 : 6;
  const offset = disabled ? 0 : pressed ? 1 : lift;

  const release = () => setPressed(false);

  return (
    <div
      className={`relative inline-block rounded-btn ${className}`}
      style={{ background: disabled ? 'transparent' : wall, paddingBottom: `${lift}px` }}
    >
      <button
        type="button"
        aria-label={ariaLabel}
        disabled={disabled}
        onPointerDown={() => !disabled && setPressed(true)}
        onPointerUp={release}
        onPointerLeave={release}
        onPointerCancel={release}
        onClick={() => {
          if (disabled) return;
          audio.play('menuClick');
          hapticUI();
          onClick?.();
        }}
        className={[
          'no-touch-callout w-full truncate rounded-btn font-black uppercase',
          'transition-transform duration-75 ease-out disabled:opacity-40',
          sizing,
        ].join(' ')}
        style={{
          background: face,
          color: text,
          transform: `translateY(-${offset}px)`,
          boxShadow: disabled
            ? 'none'
            : 'inset 0 2px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.05)',
          border: variant === 'ghost' ? '2px solid var(--color-line)' : undefined,
        }}
      >
        {children}
      </button>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Layout atoms                                                        */
/* ------------------------------------------------------------------ */

export const Card = ({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) => (
  // Cartão "macio": fundo levemente acinzentado e sombra curta, em vez de
  // uma borda fina — bordas finas dão aparência de painel/dashboard.
  <div
    className={`rounded-card bg-surface-2 p-5 ${className}`}
    style={{ boxShadow: '0 2px 0 var(--color-surface-3)' }}
  >
    {children}
  </div>
);

export const Label = ({ children }: { children: ReactNode }) => (
  <span className="text-[0.72rem] font-black tracking-[0.12em] text-ink-faint uppercase">
    {children}
  </span>
);

/** Horizontal segmented selector used throughout the setup screens. */
export const OptionRow = <T,>({
  options,
  value,
  onChange,
  format,
  columns,
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  format: (value: T) => string;
  columns?: number;
}) => (
  <div
    className="grid gap-2"
    style={{ gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))` }}
  >
    {options.map((option) => {
      const selected = option === value;
      return (
        <button
          key={String(option)}
          type="button"
          aria-pressed={selected}
          onClick={() => {
            audio.play('menuClick');
            hapticUI();
            onChange(option);
          }}
          className={[
            'no-touch-callout rounded-2xl py-3 text-sm font-black tabular',
            'transition-transform duration-75 ease-out active:translate-y-[2px]',
            selected ? 'text-on-brand' : 'text-ink-soft',
          ].join(' ')}
          style={{
            // Mesma linguagem 3D dos botões, em escala menor: a opção
            // escolhida fica "em pé" sobre uma parede colorida.
            background: selected ? 'var(--color-brand)' : 'var(--color-surface-2)',
            boxShadow: selected
              ? 'inset 0 2px 0 rgba(255,255,255,0.25), 0 3px 0 var(--color-brand-deep)'
              : '0 3px 0 var(--color-surface-3)',
          }}
        >
          {format(option)}
        </button>
      );
    })}
  </div>
);

/* ------------------------------------------------------------------ */
/* Wordmark                                                            */
/* ------------------------------------------------------------------ */

export const Wordmark = ({ size = 'lg' }: { size?: 'sm' | 'lg' | 'xl' }) => {
  const scale =
    size === 'xl'
      ? 'text-[clamp(3.5rem,17vmin,7rem)]'
      : size === 'lg'
        ? 'text-[clamp(2.6rem,12vmin,5rem)]'
        : 'text-[clamp(1.4rem,6vmin,2rem)]';

  return (
    <h1
      className={`${scale} leading-[0.82] font-black tracking-[-0.03em] uppercase select-none`}
    >
      <span className="block text-ink">TIME</span>
      <span className="block text-brand">IT!</span>
    </h1>
  );
};

/* ------------------------------------------------------------------ */
/* Confetti — deliberately sparse, only for a near-perfect stop.       */
/* ------------------------------------------------------------------ */

const CONFETTI_COLORS = ['#2fe07a', '#56ef97', '#ffd66b', '#43b8ff', '#f2f7f4'];

export const Confetti = ({ pieces = 26 }: { pieces?: number }) => (
  <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
    {Array.from({ length: pieces }).map((_, i) => {
      // Deterministic-ish spread so pieces never clump on one side.
      const left = (i * 97) % 100;
      const delay = (i % 7) * 55;
      const drift = ((i * 53) % 120) - 60;
      const spin = 360 + ((i * 137) % 540);
      return (
        <span
          key={i}
          className="absolute top-0 block h-2.5 w-1.5 rounded-[2px]"
          style={{
            left: `${left}%`,
            background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            animation: `confetti-fall ${1100 + (i % 5) * 180}ms var(--ease-out-soft) ${delay}ms both`,
            ['--drift' as string]: `${drift}px`,
            ['--spin' as string]: `${spin}deg`,
          }}
        />
      );
    })}
  </div>
);

/** Full-screen green wash for the perfect-hit moment. */
export const PerfectFlash = () => (
  <div
    aria-hidden
    className="pointer-events-none fixed inset-0 z-40 bg-brand"
    style={{ animation: 'flash-green 620ms ease-out both' }}
  />
);
