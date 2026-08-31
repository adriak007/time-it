import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.timeit.game',
  appName: 'Time It!',
  webDir: 'dist',
  android: {
    // Fundo do WebView igual ao da UI para não piscar entre o splash
    // nativo e o primeiro render do React.
    backgroundColor: '#ffffff',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false, // hidden from JS once React has painted
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#ffffff',
      overlaysWebView: true,
    },
  },
};

export default config;
