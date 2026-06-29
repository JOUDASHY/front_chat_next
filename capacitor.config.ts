import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chatbeast.app',
  appName: 'Chat Beast',
  webDir: 'public',

  server: {
    url: 'https://chat-beast.vercel.app',
    cleartext: false
  }
};

export default config;