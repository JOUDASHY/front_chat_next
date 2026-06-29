import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chatbeast.app',
  appName: 'Chat Beast',
  webDir: 'public',

  server: {
    url: 'https://chat-beast.vercel.app',
    cleartext: false
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '870239830870-qni4cj84t3ij4ggte221jfedob1jmvl4.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  }
};

export default config;