import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

/**
 * Native shell setup for the Capacitor (Android) build.
 *
 * Everything here is best-effort: on the web these plugins are absent or
 * no-ops, and any failure must leave the game running normally.
 */
export const initNativeShell = (): void => {
  try {
    if (!Capacitor.isNativePlatform()) return;

    // Tema claro: Style.Light pinta o conteúdo da barra (relógio, bateria)
    // em ESCURO, que é o necessário sobre um fundo claro.
    void StatusBar.setStyle({ style: Style.Light }).catch(() => undefined);
    void StatusBar.setBackgroundColor({ color: '#ffffff' }).catch(() => undefined);
    void StatusBar.setOverlaysWebView({ overlay: true }).catch(() => undefined);

    // Hide the native splash once React has painted.
    void SplashScreen.hide().catch(() => undefined);
  } catch {
    /* web build, or a plugin is unavailable — ignore */
  }
};
