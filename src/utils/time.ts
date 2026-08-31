/**
 * Time formatting and integer-millisecond helpers.
 *
 * Every target and step in Time It! is an INTEGER number of milliseconds.
 * Seconds only ever exist at the presentation boundary, which keeps values
 * like 0.15s exact (150ms) and avoids 0.1 + 0.2 style drift entirely.
 */

/** Convert a seconds value from the UI into integer ms. 0.15 -> 150. */
export const secondsToMs = (seconds: number): number => Math.round(seconds * 1000);

/** Convert integer ms into a float seconds value. 150 -> 0.15. */
export const msToSeconds = (ms: number): number => ms / 1000;

/**
 * Canonical in-game display: always two decimals.
 * 500 -> "0.50", 1000 -> "1.00", 3250 -> "3.25", 10000 -> "10.00"
 */
export const formatTime = (ms: number, decimals = 2): string => {
  const safe = Number.isFinite(ms) ? ms : 0;
  return (safe / 1000).toFixed(decimals);
};

/** Display with the unit appended: 3250 -> "3.25s". */
export const formatTimeWithUnit = (ms: number, decimals = 2): string =>
  `${formatTime(ms, decimals)}s`;

/**
 * Compact form for settings/menus where precision matters less than clarity.
 * 5000 -> "5s", 500 -> "0.5s", 150 -> "0.15s"
 */
export const formatTimeCompact = (ms: number): string => {
  if (ms % 1000 === 0) return `${ms / 1000}s`;
  if (ms % 100 === 0) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 1000).toFixed(2)}s`;
};

/**
 * Signed difference for the reveal: "+0.07" when late, "-0.07" when early.
 * Always shows a sign so early/late reads at a glance; exact zero shows "0.00".
 */
export const formatSignedDiff = (errorMs: number, decimals = 2): string => {
  const rounded = Number(formatTime(Math.abs(errorMs), decimals));
  if (rounded === 0) return (0).toFixed(decimals);
  const sign = errorMs > 0 ? '+' : '-';
  return `${sign}${rounded.toFixed(decimals)}`;
};

/** Thousands-separated score: 4820 -> "4,820". */
export const formatScore = (score: number): string =>
  Math.round(score).toLocaleString('en-US');

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);
