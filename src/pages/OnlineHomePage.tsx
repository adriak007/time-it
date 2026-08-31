import { useEffect, useState } from 'react';
import { Button, Card, Label, Screen } from '../components/ui';
import { ONLINE_CONFIGURED, ONLINE_URL } from '../config/online';
import { MAX_NAME_LENGTH, QUICK_PLAY_CONFIG } from '../config/gameConfig';
import { T } from '../config/strings';
import { online } from '../services/online';
import { useOnline } from '../hooks/useOnline';

interface OnlineHomePageProps {
  defaultName: string;
  onNameChange: (name: string) => void;
  onBack: () => void;
}

/**
 * Porta de entrada do online: escolher o nome e então criar uma sala ou entrar
 * com um código de 4 letras.
 */
export const OnlineHomePage = ({
  defaultName,
  onNameChange,
  onBack,
}: OnlineHomePageProps) => {
  const { status, error } = useOnline();
  const [name, setName] = useState(defaultName);
  const [code, setCode] = useState('');
  const [mode, setMode] = useState<'choose' | 'join'>('choose');

  useEffect(() => {
    online.clearError();
  }, [mode]);

  const trimmedName = name.trim();
  const canAct = trimmedName.length > 0 && status !== 'connecting';

  const handleCreate = () => {
    onNameChange(trimmedName);
    online.createRoom(trimmedName, { ...QUICK_PLAY_CONFIG, rounds: 5 });
  };

  const handleJoin = () => {
    onNameChange(trimmedName);
    online.joinRoom(code, trimmedName);
  };

  /* Servidor ainda não configurado: explica em vez de deixar o jogador
     esperando uma conexão que não vai completar. */
  if (!ONLINE_CONFIGURED) {
    return (
      <Screen>
        <header className="flex items-center justify-between px-5 pt-4 pb-2">
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-black tracking-[0.12em] text-ink-faint"
          >
            {T.common.back}
          </button>
          <span className="text-sm font-black tracking-[0.12em]">{T.online.title}</span>
          <div className="w-10" />
        </header>

        <div className="flex flex-1 flex-col items-center justify-center gap-5 px-7 text-center">
          <div className="text-[clamp(1.4rem,7vmin,2rem)] leading-tight font-black text-late">
            {T.online.notConfigured}
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-ink-soft">
            {T.online.notConfiguredBody}
          </p>
          <code className="rounded-xl bg-surface-2 px-3 py-2 text-xs text-ink-faint">
            {ONLINE_URL}
          </code>
        </div>

        <div className="px-6 pb-7">
          <Button size="lg" onClick={onBack} className="w-full">
            {T.online.backToMenu}
          </Button>
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <header className="flex items-center justify-between px-5 pt-4 pb-2">
        <button
          type="button"
          onClick={() => (mode === 'join' ? setMode('choose') : onBack())}
          className="text-xs font-black tracking-[0.12em] text-ink-faint"
        >
          {T.common.back}
        </button>
        <span className="text-sm font-black tracking-[0.12em]">{T.online.title}</span>
        <div className="w-10" />
      </header>

      <div className="flex flex-1 flex-col justify-center gap-4 px-6">
        <Card className="flex flex-col gap-3">
          <Label>{T.online.yourName}</Label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, MAX_NAME_LENGTH))}
            maxLength={MAX_NAME_LENGTH}
            placeholder={T.online.namePlaceholder}
            aria-label={T.online.yourName}
            className="rounded-2xl bg-surface px-4 py-3 text-center text-lg font-black tracking-wide text-ink uppercase outline-none"
            style={{ boxShadow: '0 3px 0 var(--color-surface-3)' }}
          />
        </Card>

        {mode === 'join' && (
          <Card className="flex flex-col gap-3">
            <Label>{T.online.codeLabel}</Label>
            <input
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4))
              }
              maxLength={4}
              placeholder={T.online.codePlaceholder}
              aria-label={T.online.codeLabel}
              inputMode="text"
              autoCapitalize="characters"
              className="tabular rounded-2xl bg-surface px-4 py-3 text-center text-[2rem] font-black tracking-[0.4em] text-brand uppercase outline-none"
              style={{ boxShadow: '0 3px 0 var(--color-surface-3)' }}
            />
          </Card>
        )}

        {error && (
          <div className="rounded-2xl bg-danger/10 px-4 py-3 text-center text-sm font-bold text-danger">
            {error}
          </div>
        )}

        {status === 'connecting' && (
          <div className="text-center text-sm font-bold text-ink-soft">
            {T.online.connecting}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2.5 px-6 pb-7">
        {mode === 'choose' ? (
          <>
            <Button size="lg" onClick={handleCreate} disabled={!canAct} className="w-full">
              {T.online.create}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setMode('join')}
              disabled={!canAct}
              className="w-full"
            >
              {T.online.join}
            </Button>
          </>
        ) : (
          <Button
            size="lg"
            onClick={handleJoin}
            disabled={!canAct || code.length !== 4}
            className="w-full"
          >
            {T.online.enter}
          </Button>
        )}
      </div>
    </Screen>
  );
};
