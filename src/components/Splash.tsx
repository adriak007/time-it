import { useEffect } from 'react';
import { TIMING } from '../config/gameConfig';
import { Wordmark } from './ui';

/**
 * Cold-start splash. Intentionally brief — it covers the first paint and the
 * font swap, and never delays the menu beyond that.
 */
export const Splash = ({ onDone }: { onDone: () => void }) => {
  useEffect(() => {
    const timer = window.setTimeout(onDone, TIMING.splashMs);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="flex h-full w-full items-center justify-center bg-base">
      <div className="anim-pop">
        <Wordmark size="lg" />
      </div>
    </div>
  );
};
