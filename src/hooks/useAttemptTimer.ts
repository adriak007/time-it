import { useCallback, useRef } from 'react';
import { TIMING } from '../config/gameConfig';
import type { PlayerId } from '../types';

/**
 * High-precision attempt timer.
 *
 * Design rules that must not be broken:
 *  - Timing uses performance.now(), a monotonic clock unaffected by wall-clock
 *    changes. Never Date.now(), never setInterval accumulation.
 *  - The start timestamp is captured in the pointerdown handler BEFORE any
 *    state update or animation, so render work never inflates the measurement.
 *  - While running, NOTHING re-renders. The start time lives in a ref, so React
 *    does no work between the two taps — which both protects precision and
 *    guarantees no elapsed value can leak into the DOM.
 *  - Every player has an independent record keyed by playerId, so four people
 *    can run overlapping timers on one device.
 */

interface RunningAttempt {
  startedAt: number;
  /** Pointer that opened this attempt; used to ignore foreign pointers. */
  pointerId: number | null;
}

export interface AttemptTimer {
  start: (playerId: PlayerId, pointerId?: number | null) => number | null;
  stop: (playerId: PlayerId) => number | null;
  isRunning: (playerId: PlayerId) => boolean;
  cancel: (playerId: PlayerId) => void;
  cancelAll: () => void;
  runningCount: () => number;
}

export const useAttemptTimer = (): AttemptTimer => {
  const running = useRef(new Map<PlayerId, RunningAttempt>());

  const start = useCallback((playerId: PlayerId, pointerId: number | null = null) => {
    // Timestamp first — before any bookkeeping — for the tightest measurement.
    const startedAt = performance.now();
    if (running.current.has(playerId)) return null;
    running.current.set(playerId, { startedAt, pointerId });
    return startedAt;
  }, []);

  const stop = useCallback((playerId: PlayerId) => {
    const endedAt = performance.now();
    const attempt = running.current.get(playerId);
    if (!attempt) return null;

    const elapsed = endedAt - attempt.startedAt;
    // Reject a stop that arrives implausibly fast: that is one physical press
    // producing two events, not a deliberate second tap.
    if (elapsed < TIMING.minAttemptMs) return null;

    running.current.delete(playerId);
    return elapsed;
  }, []);

  const isRunning = useCallback((playerId: PlayerId) => running.current.has(playerId), []);

  const cancel = useCallback((playerId: PlayerId) => {
    running.current.delete(playerId);
  }, []);

  const cancelAll = useCallback(() => {
    running.current.clear();
  }, []);

  const runningCount = useCallback(() => running.current.size, []);

  return { start, stop, isRunning, cancel, cancelAll, runningCount };
};
