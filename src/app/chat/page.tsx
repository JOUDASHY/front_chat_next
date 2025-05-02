// src/app/chat/page.tsx
'use client';

import { useState } from 'react';
import Sidebar from '@/app/components/conversations/Sidebar';
import ChatWindow from '@/app/components/conversations/ChatWindow';

export interface Conversation {
  id: string | number;
  name: string;
  lastMessage: string;
  timestamp: string;
  isGroup: boolean;
}

export default function ChatPage() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | number | null>(null);

  const handleSelectConversation = (conversation: Conversation, userId: string | number) => {
    setSelectedConversation(conversation);
    setSelectedUserId(userId);
  };

  return (
    <div className="flex h-screen">
      <Sidebar onSelectConversation={handleSelectConversation} activeConversationId={selectedConversation?.id} />
      {selectedUserId !== null && (
        <ChatWindow conversation={selectedConversation} userId={selectedUserId} />
      )}
    </div>
  );
}
