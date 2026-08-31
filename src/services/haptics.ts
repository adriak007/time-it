import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { HAPTICS } from '../config/gameConfig';

/**
 * Haptic feedback with graceful degradation:
 *   native app  -> Capacitor Haptics (proper taptic engine / vibrator)
 *   web/mobile  -> navigator.vibrate when supported
 *   otherwise   -> silently does nothing
 */

let enabled = true;
export const setHapticsEnabled = (value: boolean): void => {
  enabled = value;
};

const isNative = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

const webVibrate = (pattern: number | number[]): void => {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch {
    /* unsupported — ignore */
  }
};

const impact = (style: ImpactStyle, fallbackMs: number): void => {
  if (!enabled) return;
  if (isNative()) {
    void Haptics.impact({ style }).catch(() => webVibrate(fallbackMs));
    return;
  }
  webVibrate(fallbackMs);
};

/** First tap: barely-there confirmation, so it never disturbs the count. */
export const hapticStart = (): void => impact(ImpactStyle.Light, HAPTICS.startMs);

/** Second tap: a touch firmer, to punctuate the stop. */
export const hapticStop = (): void => impact(ImpactStyle.Medium, HAPTICS.stopMs);

export const hapticUI = (): void => impact(ImpactStyle.Light, HAPTICS.uiMs);

export const hapticCountdown = (): void => impact(ImpactStyle.Light, HAPTICS.countdownMs);

/** Celebration for a near-perfect stop. */
export const hapticPerfect = (): void => {
  if (!enabled) return;
  if (isNative()) {
    void Haptics.notification({ type: NotificationType.Success }).catch(() =>
      webVibrate(HAPTICS.perfectPattern),
    );
    return;
  }
  webVibrate(HAPTICS.perfectPattern);
};
