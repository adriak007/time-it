import { useState } from 'react';
import { Button, Card, Label, Screen } from '../components/ui';
import { GAME_NAME, GAME_TAGLINE, GAME_VERSION } from '../config/gameConfig';
import { T } from '../config/strings';
import type { Settings } from '../types';

interface SettingsPageProps {
  settings: Settings;
  onToggle: (key: keyof Settings) => void;
  onReplayTutorial: () => void;
  onBack: () => void;
}

const Toggle = ({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: () => void;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={value}
    aria-label={label}
    onClick={onChange}
    className="flex w-full items-center justify-between gap-4 py-3 text-left"
  >
    <span className="flex flex-col">
      <span className="text-sm font-bold tracking-wide">{label}</span>
      {hint && <span className="text-xs text-ink-faint">{hint}</span>}
    </span>

    <span
      className="relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200"
      style={{ background: value ? 'var(--color-brand)' : 'var(--color-surface-3)' }}
    >
      <span
        className="absolute top-1 h-5 w-5 rounded-full bg-on-brand transition-transform duration-200"
        style={{ transform: value ? 'translateX(1.5rem)' : 'translateX(0.25rem)' }}
      />
    </span>
  </button>
);

export const SettingsPage = ({
  settings,
  onToggle,
  onReplayTutorial,
  onBack,
}: SettingsPageProps) => {
  const [showAbout, setShowAbout] = useState(false);

  return (
    <Screen>
      <header className="flex items-center justify-between px-5 pt-4 pb-2">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-bold tracking-[0.2em] text-ink-faint"
        >
          {T.common.back}
        </button>
        <span className="text-sm font-extrabold tracking-[0.2em]">{T.settings.title}</span>
        <div className="w-10" />
      </header>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-6">
        <Card className="divide-y divide-line py-1">
          <Toggle label={T.settings.sound} value={settings.sound} onChange={() => onToggle('sound')} />
          <Toggle label={T.settings.music} value={settings.music} onChange={() => onToggle('music')} />
          <Toggle
            label={T.settings.haptics}
            hint={T.settings.hapticsHint}
            value={settings.haptics}
            onChange={() => onToggle('haptics')}
          />
          <Toggle
            label={T.settings.reduceMotion}
            hint={T.settings.reduceMotionHint}
            value={settings.reduceMotion}
            onChange={() => onToggle('reduceMotion')}
          />
          <Toggle
            label={T.settings.highContrast}
            hint={T.settings.highContrastHint}
            value={settings.highContrast}
            onChange={() => onToggle('highContrast')}
          />
        </Card>

        <Button variant="secondary" size="sm" onClick={onReplayTutorial}>
          {T.settings.replayTutorial}
        </Button>

        <Card className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowAbout((v) => !v)}
            className="flex items-center justify-between"
          >
            <Label>{T.settings.about}</Label>
            <span className="text-xs font-bold text-ink-faint">{showAbout ? '−' : '+'}</span>
          </button>

          {showAbout && (
            <div className="anim-fade-in flex flex-col gap-2 pt-1">
              <span className="text-lg font-extrabold tracking-tight">
                {GAME_NAME}
                <span className="ml-2 text-sm font-bold text-ink-faint">v{GAME_VERSION}</span>
              </span>
              <p className="text-sm leading-relaxed text-ink-soft">{GAME_TAGLINE}</p>
              <p className="text-xs leading-relaxed text-ink-faint">
                {T.settings.aboutTech}
              </p>
            </div>
          )}
        </Card>
      </div>
    </Screen>
  );
};
