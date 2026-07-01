'use client';

import { PhoneArrowDownLeftIcon, PhoneArrowUpRightIcon, VideoCameraIcon, UsersIcon } from '@heroicons/react/24/outline';
import { CallEvent, getCallEventLabel, isCallMissedForUser } from '@/lib/callUtils';

interface CallEventBubbleProps {
  callEvent: CallEvent;
  currentUserId: number;
  timestamp: string;
}

export default function CallEventBubble({ callEvent, currentUserId, timestamp }: CallEventBubbleProps) {
  const label = getCallEventLabel(callEvent, currentUserId);
  const outgoing = callEvent.initiator_id === currentUserId;
  const missed = isCallMissedForUser(callEvent, currentUserId);
  const isVideo = callEvent.type === 'video';
  const isGroup = callEvent.is_group;

  const Icon = isGroup
    ? UsersIcon
    : isVideo
      ? VideoCameraIcon
      : outgoing
        ? PhoneArrowUpRightIcon
        : PhoneArrowDownLeftIcon;

  const colorClass = missed || callEvent.status === 'rejected'
    ? 'text-red-500'
    : 'text-[var(--blue)]';

  return (
    <div className="flex justify-center my-3">
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm max-w-[90%]">
        <Icon className={`h-4 w-4 shrink-0 ${colorClass}`} />
        <span className={`text-xs font-medium ${colorClass}`}>{label}</span>
        <span className="text-[10px] text-gray-400">
          {new Date(timestamp).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
}
