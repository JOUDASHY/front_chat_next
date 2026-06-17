export type ChatAppLayer = 'root' | 'calls' | 'discover' | 'conversation';

const CHAT_PATH = '/chat';

export function pushChatLayer(layer: ChatAppLayer) {
  if (typeof window === 'undefined') return;
  window.history.pushState({ chatAppLayer: layer }, '', CHAT_PATH);
}

export function replaceChatRoot() {
  if (typeof window === 'undefined') return;
  window.history.replaceState({ chatAppLayer: 'root' }, '', CHAT_PATH);
}

export function stayOnChatRoot() {
  pushChatLayer('root');
}
