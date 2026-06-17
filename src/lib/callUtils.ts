export function formatCallDuration(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return m ? `${h} h ${m} min` : `${h} h`;
  }
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s ? `${m} min ${s.toString().padStart(2, '0')} s` : `${m} min`;
  }
  if (seconds > 0) return `${seconds} s`;
  return '';
}

/** Minuterie en direct pendant l'appel (ex. 02:35, 1:05:12). */
export function formatCallTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export interface CallEvent {
  type: 'audio' | 'video';
  status: 'completed' | 'missed' | 'rejected' | 'cancelled';
  duration_seconds?: number;
  initiator_id: number;
}

export function getCallEventLabel(callEvent: CallEvent, currentUserId: number): string {
  const typeLabel = callEvent.type === 'video' ? 'Appel vidéo' : 'Appel vocal';
  const outgoing = callEvent.initiator_id === currentUserId;
  const duration = formatCallDuration(callEvent.duration_seconds || 0);

  switch (callEvent.status) {
    case 'completed':
      return duration ? `${typeLabel} · ${duration}` : typeLabel;
    case 'missed':
      return outgoing ? `${typeLabel} sans réponse` : `${typeLabel} manqué`;
    case 'rejected':
      return outgoing ? `${typeLabel} refusé` : `${typeLabel} refusé`;
    case 'cancelled':
      return `${typeLabel} annulé`;
    default:
      return typeLabel;
  }
}

export function isCallMissedForUser(callEvent: CallEvent, currentUserId: number): boolean {
  return callEvent.status === 'missed' && callEvent.initiator_id !== currentUserId;
}
