import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ecoreto.campus',
  appName: 'EcoReto Campus',
  webDir: 'dist/frontend/browser',
  bundledWebRuntime: false,
  loggingBehavior: 'debug',
  server: {
    cleartext: true,
    allowNavigation: [
      'ecoreto.campus',
      'localhost',
      '10.0.2.2',
      '192.168.*'
    ]
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true,
    backgroundColor: '#eeffed',
    overrideUserAgent: 'EcoRetoCampus/1.0'
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#eeffed',
      showSpinner: false
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#eeffed'
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true
    },
    CapacitorHttp: {
      enabled: true
    }
  }
};

export default config;
