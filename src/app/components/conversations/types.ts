// src/app/components/conversations/types.ts
export interface Conversation {
    id: number;
    name: string;
    lastMessage: string;
    timestamp: string;
    isGroup: boolean;
    userId?: number;
  }
  