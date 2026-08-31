import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadState, saveState } from '../services/storage';
import { audio } from '../services/audio';
import { setHapticsEnabled } from '../services/haptics';
import { DEFAULT_STATS } from '../config/gameConfig';
import type { GameConfigInput, PersistedState, Settings, Stats } from '../types';

/**
 * Owns everything that survives a reload: settings, stats, player names, the
 * last used configuration and the tutorial flag. Writes through to
 * localStorage on every change and keeps the audio/haptics engines in sync.
 */
export const usePersistedState = () => {
  const [state, setState] = useState<PersistedState>(() => loadState());

  useEffect(() => {
    saveState(state);
  }, [state]);

  // Settings drive side-effectful engines and document-level classes.
  useEffect(() => {
    audio.setEnabled(state.settings.sound);
    setHapticsEnabled(state.settings.haptics);
    const root = document.documentElement;
    root.classList.toggle('reduce-motion', state.settings.reduceMotion);
    root.classList.toggle('high-contrast', state.settings.highContrast);
  }, [state.settings]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setState((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
  }, []);

  const toggleSetting = useCallback((key: keyof Settings) => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, [key]: !prev.settings[key] },
    }));
  }, []);

  const updateStats = useCallback((updater: (stats: Stats) => Stats) => {
    setState((prev) => ({ ...prev, stats: updater(prev.stats) }));
  }, []);

  const resetStats = useCallback(() => {
    setState((prev) => ({ ...prev, stats: { ...DEFAULT_STATS } }));
  }, []);

  const setLastConfig = useCallback((config: GameConfigInput) => {
    setState((prev) => ({ ...prev, lastConfig: config }));
  }, []);

  const completeTutorial = useCallback(() => {
    setState((prev) => ({ ...prev, tutorialCompleted: true }));
  }, []);

  const replayTutorial = useCallback(() => {
    setState((prev) => ({ ...prev, tutorialCompleted: false }));
  }, []);

  return useMemo(
    () => ({
      settings: state.settings,
      stats: state.stats,
      lastConfig: state.lastConfig,
      tutorialCompleted: state.tutorialCompleted,
      updateSettings,
      toggleSetting,
      updateStats,
      resetStats,
      setLastConfig,
      completeTutorial,
      replayTutorial,
    }),
    [
      state,
      updateSettings,
      toggleSetting,
      updateStats,
      resetStats,
      setLastConfig,
      completeTutorial,
      replayTutorial,
    ],
  );
};

export type PersistedStore = ReturnType<typeof usePersistedState>;
