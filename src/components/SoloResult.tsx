import { useEffect, useState } from 'react';
import { DEV_MODE, PERFECT_FX_THRESHOLD_MS, STREAK, TIMING } from '../config/gameConfig';
import { T } from '../config/strings';
import { audio } from '../services/audio';
import { hapticPerfect } from '../services/haptics';
import { getRating } from '../services/scoring';
import type { PlayerAttempt } from '../types';
import { formatSignedDiff, formatTime } from '../utils/time';
import { Confetti, Label, PerfectFlash } from './ui';

const TONE_COLOR: Record<string, string> = {
  gold: 'var(--color-gold)',
  green: 'var(--color-brand)',
  lime: 'var(--color-brand-bright)',
  neutral: 'var(--color-ink-soft)',
  warn: 'var(--color-danger)',
};

interface SoloResultProps {
  attempt: PlayerAttempt;
  targetMs: number;
  streak: number;
  reduceMotion: boolean;
}

/**
 * Staged reveal. The numbers are already computed — this only controls the
 * pacing, building a short beat of suspense before the verdict lands.
 * Stage 0: target · 1: your time · 2: difference · 3: rating + score
 */
export const SoloResult = ({ attempt, targetMs, streak, reduceMotion }: SoloResultProps) => {
  const [stage, setStage] = useState(reduceMotion ? 3 : 0);

  const absError = attempt.absErrorMs ?? 0;
  const isPerfect = absError <= PERFECT_FX_THRESHOLD_MS;
  const rating = getRating(attempt.rating ?? 'wayoff');
  const color = TONE_COLOR[rating.tone];

  useEffect(() => {
    if (reduceMotion) return;
    const timers = [1, 2, 3].map((step) =>
      window.setTimeout(() => setStage(step), TIMING.revealStaggerMs * step),
    );
    return () => timers.forEach(window.clearTimeout);
  }, [reduceMotion]);

  // Sound and haptics fire once, when the verdict appears.
  useEffect(() => {
    if (stage < 3) return;
    if (isPerfect) {
      audio.play('perfect');
      hapticPerfect();
    } else if (absError <= 200) {
      audio.play('good');
    } else {
      audio.play('bad');
    }
  }, [stage, isPerfect, absError]);

  const directionLabel =
    attempt.direction === 'exact'
      ? T.game.exact
      : attempt.direction === 'early'
        ? T.game.early
        : T.game.late;

  const directionColor =
    attempt.direction === 'exact'
      ? 'var(--color-gold)'
      : attempt.direction === 'early'
        ? 'var(--color-early)'
        : 'var(--color-late)';

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      {isPerfect && stage >= 3 && !reduceMotion && (
        <>
          <PerfectFlash />
          <Confetti />
        </>
      )}

      <div className="flex flex-col items-center gap-1 opacity-70">
        <Label>{T.common.target}</Label>
        <div className="tabular text-[clamp(1.6rem,7vmin,2.4rem)] font-bold text-ink-soft">
          {formatTime(targetMs)}s
        </div>
      </div>

      {stage >= 1 && (
        <div className="anim-pop flex flex-col items-center gap-1">
          <Label>{T.game.yourTime}</Label>
          <div className="tabular text-[clamp(3.6rem,20vmin,7rem)] leading-none font-extrabold">
            {formatTime(attempt.elapsedMs ?? 0)}
          </div>
        </div>
      )}

      {stage >= 2 && (
        <div className="anim-pop flex flex-col items-center gap-1">
          <div
            className="tabular text-[clamp(1.8rem,9vmin,3rem)] leading-none font-extrabold"
            style={{ color: directionColor }}
          >
            {formatSignedDiff(attempt.errorMs ?? 0)}s
          </div>
          <span
            className="text-xs font-bold tracking-[0.32em]"
            style={{ color: directionColor }}
          >
            {directionLabel}
          </span>
        </div>
      )}

      {stage >= 3 && (
        <div className="anim-pop flex flex-col items-center gap-3">
          {/* A nota é o clímax da rodada: vira um selo colorido, não só texto. */}
          <div
            className="rounded-full px-7 py-3 text-[clamp(2rem,11vmin,3.4rem)] leading-none font-black tracking-tight"
            style={{
              color,
              // color-mix aceita custom properties; concatenar sufixo hex
              // (`${color}1f`) produziria CSS inválido com var().
              background: `color-mix(in srgb, ${color} 14%, transparent)`,
            }}
          >
            {rating.label}
          </div>

          <div className="tabular text-xl font-black text-ink">
            +{attempt.score} {T.common.points}
          </div>

          {attempt.streakBonus > 0 && (
            <div className="tabular text-xs font-bold tracking-[0.2em] text-brand">
              +{attempt.streakBonus} {T.game.streakBonus}
            </div>
          )}

          {DEV_MODE && (
            <div className="tabular text-[0.6rem] text-ink-faint">
              raw {attempt.elapsedMs?.toFixed(3)}ms · err {attempt.errorMs?.toFixed(3)}ms
            </div>
          )}

          {streak >= STREAK.displayFrom && (
            <div className="rounded-full border border-brand/40 bg-brand/10 px-4 py-1.5 text-xs font-bold tracking-[0.2em] text-brand">
              {streak}x {T.game.streak}{streak >= 5 ? '!' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
