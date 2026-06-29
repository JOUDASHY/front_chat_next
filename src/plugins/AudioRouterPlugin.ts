import { registerPlugin } from '@capacitor/core';

export interface AudioRouterPlugin {
  setSpeakerOn(options: { enabled: boolean }): Promise<void>;
}

const AudioRouterPlugin = registerPlugin<AudioRouterPlugin>('AudioRouterPlugin');

export { AudioRouterPlugin };
