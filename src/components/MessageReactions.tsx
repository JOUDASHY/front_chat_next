'use client';

import { QUICK_REACTIONS, type MessageReactionGroup } from '@/lib/messageReactions';

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  align?: 'left' | 'right';
}

export function ReactionPicker({ onSelect, align = 'left' }: ReactionPickerProps) {
  return (
    <div
      className={`absolute -top-11 z-30 flex items-center gap-0.5 rounded-full border border-gray-200 bg-white px-1.5 py-1 shadow-lg ${
        align === 'right' ? 'right-0' : 'left-0'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {QUICK_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onSelect(emoji)}
          className="h-8 w-8 rounded-full text-lg leading-none hover:bg-gray-100 hover:scale-110 transition-transform"
          aria-label={`Réagir avec ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

interface MessageReactionsBarProps {
  reactions?: MessageReactionGroup[];
  isCurrentUser: boolean;
  onReact: (emoji: string) => void;
}

export function MessageReactionsBar({
  reactions = [],
  isCurrentUser,
  onReact,
}: MessageReactionsBarProps) {
  if (!reactions.length) return null;

  return (
    <div className={`flex flex-wrap gap-1 mt-1 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          type="button"
          onClick={() => onReact(reaction.emoji)}
          title={reaction.users.map((u) => u.display_name).join(', ')}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs shadow-sm transition-colors ${
            reaction.reacted_by_me
              ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <span className="text-sm leading-none">{reaction.emoji}</span>
          <span className="font-medium tabular-nums">{reaction.count}</span>
        </button>
      ))}
    </div>
  );
}
