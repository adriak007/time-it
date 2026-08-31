import { useEffect, useRef, useState } from 'react';
import { TIMING } from '../config/gameConfig';
import { T } from '../config/strings';
import { audio } from '../services/audio';
import { hapticCountdown } from '../services/haptics';
import { formatTime } from '../utils/time';
import { Label } from './ui';

interface RoundIntroProps {
  roundNumber: number;
  totalRounds: string;
  targetMs: number;
  onComplete: () => void;
}

/**
 * Announces the round and its target, then counts 3-2-1-GO.
 *
 * The countdown ONLY unlocks the buttons — it never starts anyone's timer.
 * Each player still has to tap to begin, which is what keeps the game a test
 * of internal timing rather than of reaction to a visual cue.
 */
export const RoundIntro = ({
  roundNumber,
  totalRounds,
  targetMs,
  onComplete,
}: RoundIntroProps) => {
  const [phase, setPhase] = useState<'target' | 'countdown'>('target');
  const [count, setCount] = useState<number>(TIMING.countdownSteps);
  const completed = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setPhase('countdown'), TIMING.roundIntroMs);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (phase !== 'countdown') return;

    if (count > 0) {
      audio.play('countdown');
      hapticCountdown();
      const timer = window.setTimeout(() => setCount((c) => c - 1), TIMING.countdownStepMs);
      return () => window.clearTimeout(timer);
    }

    // count === 0 -> "GO!"
    audio.play('go');
    const timer = window.setTimeout(() => {
      if (completed.current) return;
      completed.current = true;
      onComplete();
    }, TIMING.countdownStepMs);
    return () => window.clearTimeout(timer);
  }, [count, phase, onComplete]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
      {phase === 'target' ? (
        <div className="anim-fade-up flex flex-col items-center gap-7">
          <Label>
            {T.common.round} {roundNumber} / {totalRounds}
          </Label>

          <div className="flex flex-col items-center gap-1">
            <Label>{T.common.target}</Label>
            <div className="tabular text-[clamp(4.5rem,26vmin,11rem)] leading-none font-extrabold tracking-tight text-brand">
              {formatTime(targetMs)}
            </div>
            <span className="text-sm font-bold tracking-[0.34em] text-ink-faint">{T.common.seconds}</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6">
          <Label>{T.game.ready}</Label>
          <div
            key={count}
            className="tabular text-[clamp(5rem,30vmin,13rem)] leading-none font-extrabold"
            style={{
              animation: `count-in ${TIMING.countdownStepMs}ms var(--ease-out-soft) both`,
              color: count === 0 ? 'var(--color-brand)' : 'var(--color-ink)',
            }}
          >
            {count === 0 ? T.game.go : count}
          </div>
        </div>
      )}
    </div>
  );
};
