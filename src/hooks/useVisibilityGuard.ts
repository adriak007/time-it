import { useEffect } from 'react';

/**
 * Invalidates an in-flight attempt when the app loses visibility.
 *
 * Backgrounding the app would otherwise be an exploit: a player could switch
 * away, use another device's clock, and return with a perfect answer. It is
 * also simply unfair to leave a timer running through a phone call.
 */
export const useVisibilityGuard = (active: boolean, onInterrupt: () => void): void => {
  useEffect(() => {
    if (!active) return;

    const handleHidden = () => {
      if (document.visibilityState === 'hidden') onInterrupt();
    };

    // Only these two signals are used. A plain window `blur` also fires for
    // harmless focus changes (devtools, an OS notification) and would void
    // perfectly legitimate attempts.
    document.addEventListener('visibilitychange', handleHidden);
    // pagehide covers iOS Safari cases where visibilitychange can be skipped.
    window.addEventListener('pagehide', onInterrupt);

    return () => {
      document.removeEventListener('visibilitychange', handleHidden);
      window.removeEventListener('pagehide', onInterrupt);
    };
  }, [active, onInterrupt]);
};
