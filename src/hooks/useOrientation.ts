import { useCallback, useSyncExternalStore } from 'react';

const QUERY = '(orientation: landscape)';

/**
 * Tracks landscape vs portrait so the arena can re-flow.
 *
 * Uses a media query rather than window dimensions, which avoids re-layout
 * churn when the mobile URL bar or keyboard changes the viewport height.
 * `useSyncExternalStore` is the right primitive here: the browser owns this
 * value, so it is read during render instead of mirrored into state by an
 * effect (which would cost an extra render on every rotation).
 */
export const useOrientation = (): boolean => {
  const subscribe = useCallback((onChange: () => void) => {
    const list = window.matchMedia(QUERY);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, []);

  const getSnapshot = useCallback(() => window.matchMedia(QUERY).matches, []);

  // Server/prerender fallback: assume portrait, the common phone case.
  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
};
