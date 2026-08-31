import { useState } from 'react';
import { Button, Card, Label, Screen } from '../components/ui';
import { T } from '../config/strings';
import type { Stats } from '../types';
import { formatScore, formatTime } from '../utils/time';

interface StatsPageProps {
  stats: Stats;
  onReset: () => void;
  onBack: () => void;
}

const StatTile = ({ label, value }: { label: string; value: string }) => (
  <Card className="flex flex-col gap-1.5">
    <Label>{label}</Label>
    <span className="tabular text-[clamp(1.3rem,6vmin,1.75rem)] leading-none font-extrabold">
      {value}
    </span>
  </Card>
);

export const StatsPage = ({ stats, onReset, onBack }: StatsPageProps) => {
  const [confirming, setConfirming] = useState(false);

  const attempts = stats.earlyCount + stats.lateCount;
  const averageError =
    stats.roundsPlayed > 0 ? stats.totalAbsErrorMs / stats.roundsPlayed : null;

  // Percentages are computed only from attempts that actually landed early or
  // late; an exact stop belongs to neither side.
  const earlyPct = attempts > 0 ? Math.round((stats.earlyCount / attempts) * 100) : 0;
  const latePct = attempts > 0 ? 100 - earlyPct : 0;

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
        <span className="text-sm font-extrabold tracking-[0.2em]">{T.stats.title}</span>
        <div className="w-10" />
      </header>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-4">
        <div className="grid grid-cols-2 gap-3">
          <StatTile label={T.stats.gamesPlayed} value={String(stats.gamesPlayed)} />
          <StatTile label={T.stats.roundsPlayed} value={String(stats.roundsPlayed)} />
          <StatTile
            label={T.stats.averageError}
            value={averageError == null ? '—' : `${formatTime(averageError)}s`}
          />
          <StatTile
            label={T.stats.bestAttempt}
            value={stats.bestAbsErrorMs == null ? '—' : `${formatTime(stats.bestAbsErrorMs, 3)}s`}
          />
          <StatTile label={T.stats.perfectHits} value={String(stats.perfectHits)} />
          <StatTile label={T.stats.bestScore} value={formatScore(stats.bestScore)} />
          <StatTile label={T.stats.longestStreak} value={`${stats.longestStreak}x`} />
          <StatTile
            label={T.stats.attempts}
            value={String(attempts)}
          />
        </div>

        <Card className="flex flex-col gap-3">
          <Label>{T.stats.tendency}</Label>
          {attempts === 0 ? (
            <span className="text-sm text-ink-faint">{T.stats.tendencyEmpty}</span>
          ) : (
            <>
              <div className="flex h-3 overflow-hidden rounded-full bg-surface-3">
                <div className="h-full bg-early" style={{ width: `${earlyPct}%` }} />
                <div className="h-full bg-late" style={{ width: `${latePct}%` }} />
              </div>
              <div className="flex justify-between text-xs font-bold tracking-[0.16em]">
                <span className="text-early">{T.stats.early} {earlyPct}%</span>
                <span className="text-late">{T.stats.late} {latePct}%</span>
              </div>
            </>
          )}
        </Card>

        {confirming ? (
          <Card className="flex flex-col gap-3">
            <span className="text-sm font-bold">{T.stats.resetConfirm}</span>
            <span className="text-xs text-ink-soft">{T.stats.resetWarning}</span>
            <div className="flex gap-2">
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  onReset();
                  setConfirming(false);
                }}
              >
                {T.stats.resetYes}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                {T.common.cancel}
              </Button>
            </div>
          </Card>
        ) : (
          <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>
            {T.stats.reset}
          </Button>
        )}
      </div>
    </Screen>
  );
};
