export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '👏', '🔥'] as const;

export type ReactionEmoji = (typeof QUICK_REACTIONS)[number];

export interface ReactionUser {
  id: number;
  username: string;
  display_name: string;
}

export interface MessageReactionGroup {
  emoji: string;
  count: number;
  users: ReactionUser[];
  reacted_by_me: boolean;
}

export interface MessageReactionEvent {
  message_id: number;
  reactions: MessageReactionGroup[];
}
