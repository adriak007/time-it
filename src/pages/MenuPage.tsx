import { Button, Screen, Wordmark } from '../components/ui';
import { GAME_VERSION } from '../config/gameConfig';
import { T } from '../config/strings';

interface MenuPageProps {
  onQuickPlay: () => void;
  onOnline: () => void;
  onCustomGame: () => void;
  onStats: () => void;
  onSettings: () => void;
}

/**
 * The front door. Big wordmark, one obvious action, everything else quiet.
 */
export const MenuPage = ({
  onQuickPlay,
  onOnline,
  onCustomGame,
  onStats,
  onSettings,
}: MenuPageProps) => (
  <Screen className="relative">
    {/* Bolha decorativa: um respingo de cor no fundo branco. Estática —
        nada aqui pode sugerir passagem de tempo.

        `fixed` em vez de `absolute`: dentro do palco de largura limitada do
        desktop ela era recortada num retângulo, com bordas visíveis. */}
    <div
      aria-hidden
      className="pointer-events-none fixed -top-[28vmin] left-1/2 -z-10 h-[70vmin] w-[70vmin] -translate-x-1/2 rounded-full"
      style={{ background: 'var(--color-brand)', opacity: 0.07 }}
    />

    {/* No celular o `flex-1` empurra a marca para cima e os botões para o
        rodapé, que é o certo para o polegar. Numa tela alta de PC isso abre
        um vazio no meio, então o bloco todo se agrupa e centraliza:
        `justify-center` com margem automática no grupo de baixo. */}
    <div className="relative flex flex-1 flex-col items-center justify-center gap-2 px-7 pt-6">
      <div className="anim-fade-up flex flex-col items-center text-center">
        <Wordmark size="xl" />
        <p className="mt-5 max-w-[15rem] text-sm leading-relaxed text-ink-soft">
          {T.menu.tagline}
        </p>
      </div>
    </div>

    <div className="relative flex flex-col gap-3 px-7 pb-8 [@media(pointer:fine)]:mt-auto [@media(pointer:fine)]:pb-10">
      <Button size="lg" onClick={onQuickPlay} className="anim-fade-up w-full">
        {T.menu.play}
      </Button>

      <Button variant="accent" onClick={onOnline} className="w-full">
        {T.online.menuButton}
      </Button>

      <div className="grid grid-cols-3 gap-2">
        <Button variant="secondary" size="sm" onClick={onCustomGame}>
          {T.menu.custom}
        </Button>
        <Button variant="secondary" size="sm" onClick={onStats}>
          {T.menu.stats}
        </Button>
        <Button variant="secondary" size="sm" onClick={onSettings}>
          {T.menu.settings}
        </Button>
      </div>

      <span className="mt-1 text-center text-[0.65rem] font-bold tracking-[0.28em] text-ink-faint">
        V{GAME_VERSION}
      </span>
    </div>
  </Screen>
);
