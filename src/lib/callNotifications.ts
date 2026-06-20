import type { CallType } from '@/context/CallContext';

const INCOMING_CALL_TAG = 'chat-beast-incoming-call';
let activeNotification: Notification | null = null;

export async function ensureCallNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }

  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function showIncomingCallNotification(
  peerName: string,
  callType: CallType
): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  closeIncomingCallNotification();

  const label = callType === 'video' ? 'Appel vidéo entrant' : 'Appel vocal entrant';

  activeNotification = new Notification(label, {
    body: `${peerName} vous appelle`,
    tag: INCOMING_CALL_TAG,
    requireInteraction: true,
    silent: true,
  });

  activeNotification.onclick = () => {
    window.focus();
    closeIncomingCallNotification();
  };
}

export function closeIncomingCallNotification(): void {
  if (activeNotification) {
    activeNotification.close();
    activeNotification = null;
  }
}
