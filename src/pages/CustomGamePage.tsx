import { useMemo, useState } from 'react';
import { Button, Card, Label, OptionRow, Screen } from '../components/ui';
import {
  MAX_NAME_LENGTH,
  MAX_TARGET_PRESETS,
  MIN_TARGET_PRESETS,
  PLAYER_ACCENTS,
  ROUND_OPTIONS,
  STEP_OPTIONS,
  defaultPlayerName,
} from '../config/gameConfig';
import { T } from '../config/strings';
import { normalizeRange, validTargets } from '../services/target';
import type { GameConfigInput, PlayerCount, RoundsSetting } from '../types';
import { formatTimeCompact } from '../utils/time';

interface CustomGamePageProps {
  initial: GameConfigInput;
  onStart: (config: GameConfigInput) => void;
  onBack: () => void;
}

const PLAYER_OPTIONS: PlayerCount[] = [1, 2, 3, 4];

/**
 * Match setup. Every control writes integer milliseconds; the range is
 * normalised on change so `max` can never fall to or below `min`.
 */
export const CustomGamePage = ({ initial, onStart, onBack }: CustomGamePageProps) => {
  const [players, setPlayers] = useState<PlayerCount>(initial.players);
  const [names, setNames] = useState<string[]>(() =>
    Array.from({ length: 4 }, (_, i) => initial.playerNames[i] ?? defaultPlayerName(i)),
  );
  const [minMs, setMinMs] = useState(initial.minTargetMs);
  const [maxMs, setMaxMs] = useState(initial.maxTargetMs);
  const [stepMs, setStepMs] = useState(initial.stepMs);
  const [rounds, setRounds] = useState<RoundsSetting>(initial.rounds);
  const [showNames, setShowNames] = useState(false);

  const possibleCount = useMemo(
    () => validTargets(minMs, maxMs, stepMs).length,
    [minMs, maxMs, stepMs],
  );

  const applyMin = (value: number) => {
    const next = normalizeRange(value, maxMs);
    setMinMs(next.minMs);
    setMaxMs(next.maxMs);
  };

  const applyMax = (value: number) => {
    const next = normalizeRange(minMs, value);
    setMinMs(next.minMs);
    setMaxMs(next.maxMs);
  };

  const updateName = (index: number, value: string) => {
    setNames((prev) => {
      const next = [...prev];
      next[index] = value.slice(0, MAX_NAME_LENGTH);
      return next;
    });
  };

  const handleStart = () => {
    const range = normalizeRange(minMs, maxMs);
    onStart({
      players,
      playerNames: names.map((name, i) => name.trim() || defaultPlayerName(i)),
      minTargetMs: range.minMs,
      maxTargetMs: range.maxMs,
      stepMs,
      rounds,
    });
  };

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
        <span className="text-sm font-extrabold tracking-[0.2em]">{T.custom.title}</span>
        <div className="w-10" />
      </header>

      {/* min-h-0 lets this flex child actually scroll; the trailing padding
          keeps the last card clear of the fixed START MATCH bar. */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-14">
        <Card className="flex flex-col gap-3">
          <Label>{T.custom.players}</Label>
          <OptionRow
            options={PLAYER_OPTIONS}
            value={players}
            onChange={setPlayers}
            format={(value) => String(value)}
          />

          <button
            type="button"
            onClick={() => setShowNames((v) => !v)}
            className="self-start text-[0.65rem] font-bold tracking-[0.2em] text-brand"
          >
            {showNames ? T.custom.hideNames : T.custom.editNames}
          </button>

          {showNames && (
            <div className="flex flex-col gap-2">
              {Array.from({ length: players }, (_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span
                    className="w-6 text-xs font-extrabold"
                    style={{ color: PLAYER_ACCENTS[i + 1] }}
                  >
                    P{i + 1}
                  </span>
                  <input
                    value={names[i]}
                    onChange={(e) => updateName(i, e.target.value)}
                    maxLength={MAX_NAME_LENGTH}
                    aria-label={T.custom.nameLabel(i + 1)}
                    className="flex-1 rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm font-bold tracking-wide text-ink uppercase outline-none focus:border-brand"
                  />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <Label>{T.custom.minTarget}</Label>
            <span className="tabular shrink-0 text-sm font-extrabold text-brand">
              {formatTimeCompact(minMs)}
            </span>
          </div>
          <OptionRow
            options={MIN_TARGET_PRESETS}
            value={minMs}
            onChange={applyMin}
            format={formatTimeCompact}
          />
          <input
            type="range"
            min={100}
            max={30000}
            step={100}
            value={minMs}
            onChange={(e) => applyMin(Number(e.target.value))}
            aria-label={T.custom.minAria}
            className="accent-brand"
          />
        </Card>

        <Card className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <Label>{T.custom.maxTarget}</Label>
            <span className="tabular shrink-0 text-sm font-extrabold text-brand">
              {formatTimeCompact(maxMs)}
            </span>
          </div>
          <OptionRow
            options={MAX_TARGET_PRESETS}
            value={maxMs}
            onChange={applyMax}
            format={formatTimeCompact}
          />
          <input
            type="range"
            min={200}
            max={60000}
            step={100}
            value={maxMs}
            onChange={(e) => applyMax(Number(e.target.value))}
            aria-label={T.custom.maxAria}
            className="accent-brand"
          />
        </Card>

        <Card className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <Label>{T.custom.step}</Label>
            <span className="tabular shrink-0 text-[0.65rem] font-bold text-ink-faint">
              {possibleCount} {T.custom.possibleTargets}
            </span>
          </div>
          <OptionRow
            options={STEP_OPTIONS}
            value={stepMs}
            onChange={setStepMs}
            format={formatTimeCompact}
            columns={4}
          />
        </Card>

        <Card className="flex flex-col gap-3">
          <Label>{T.custom.rounds}</Label>
          <OptionRow
            options={ROUND_OPTIONS}
            value={rounds}
            onChange={setRounds}
            format={(value) => (value === 'endless' ? '∞' : String(value))}
            columns={4}
          />
        </Card>
      </div>

      <div className="bg-base px-5 pt-3 pb-6">
        <Button size="lg" onClick={handleStart} className="w-full">
          {T.custom.start}
        </Button>
      </div>
    </Screen>
  );
};
