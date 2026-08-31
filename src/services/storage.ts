import {
  DEFAULT_SETTINGS,
  DEFAULT_STATS,
  STORAGE_KEY,
} from '../config/gameConfig';
import type { PersistedState, Settings, Stats } from '../types';

/**
 * localStorage wrapper. Every access is guarded: private browsing, disabled
 * site data, and quota errors must never break the game — they just mean the
 * session is not persisted.
 */

const defaultState = (): PersistedState => ({
  settings: { ...DEFAULT_SETTINGS },
  stats: { ...DEFAULT_STATS },
  lastConfig: null,
  tutorialCompleted: false,
});

const isAvailable = (): boolean => {
  try {
    const probe = '__timeit_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
};

let available: boolean | null = null;
const storageReady = (): boolean => {
  if (available === null) available = isAvailable();
  return available;
};

export const loadState = (): PersistedState => {
  const fallback = defaultState();
  if (!storageReady()) return fallback;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    // Merge field-by-field so a stored payload from an older build (missing
    // keys) still yields a complete, valid state.
    return {
      settings: { ...fallback.settings, ...(parsed.settings ?? {}) },
      stats: { ...fallback.stats, ...(parsed.stats ?? {}) },
      lastConfig: parsed.lastConfig ?? null,
      tutorialCompleted: parsed.tutorialCompleted ?? false,
    };
  } catch {
    return fallback;
  }
};

export const saveState = (state: PersistedState): void => {
  if (!storageReady()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota exceeded or storage disabled — gameplay continues unaffected */
  }
};

export const resetStats = (state: PersistedState): PersistedState => ({
  ...state,
  stats: { ...DEFAULT_STATS },
});

export const defaultSettings = (): Settings => ({ ...DEFAULT_SETTINGS });
export const defaultStats = (): Stats => ({ ...DEFAULT_STATS });
