// src/app/chat/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import Sidebar from '@/app/components/conversations/Sidebar';
import ChatWindow from '@/app/components/conversations/ChatWindow';
import DefaultView from '@/app/components/conversations/DefaultView';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/axiosClient';

export interface Conversation {
  id: number;
  name: string;
  lastMessage: string;
  timestamp: string;
  isGroup: boolean;
  userId?: number;
  user: {
    profile?: {
      image?: string;
    }
  } | null;
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="h-screen w-full bg-[var(--blue)]" />}>
      <ChatPageContent />
    </Suspense>
  );
}

function ChatPageContent() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showDiscover, setShowDiscover] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Détecter mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Lire les query params et ouvrir directement la conversation
  useEffect(() => {
    const convId = searchParams.get('conversation');
    const uId = searchParams.get('userId');

    if (!uId) return;

    const userIdNum = parseInt(uId, 10);
    if (isNaN(userIdNum)) return;

    // Créer/récupérer la conversation via l'API puis l'ouvrir
    const openConversation = async () => {
      try {
        const { data } = await api.post('/api/chat/conversations/create/', {
          user_id: userIdNum,
        });

        setSelectedConversation(data);
        setSelectedUserId(userIdNum);
        if (isMobile) setShowChat(true);

        // Nettoyer les query params sans recharger la page
        router.replace('/chat', { scroll: false });
      } catch (err) {
        console.error('Failed to open conversation from query params:', err);
      }
    };

    openConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSelectConversation = (conversation: Conversation, userId: number) => {
    setSelectedConversation(conversation);
    setSelectedUserId(userId);
    setShowDiscover(false);
    if (isMobile) setShowChat(true);
  };

  const handleBackToList = () => {
    if (isMobile) setShowChat(false);
  };

  // Sur mobile, ouvrir la page découverte dans la zone droite
  const handleDiscover = () => {
    if (isMobile) {
      setShowChat(true);        // affiche la zone droite
      setSelectedUserId(null);  // force DefaultView (pas de chat)
      setSelectedConversation(null);
      setShowDiscover(true);
    } else {
      setShowDiscover(true);
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Sidebar */}
      <div
        className={`
          ${isMobile ? 'w-full' : 'w-[384px]'}
          ${isMobile && showChat ? 'hidden' : 'block'}
          absolute top-0 bottom-0 left-0 z-10
        `}
      >
        <Sidebar
          onSelectConversation={handleSelectConversation}
          activeConversationId={selectedConversation?.id}
          onDiscover={handleDiscover}
        />
      </div>

      {/* ChatWindow ou DefaultView */}
      <div
        className={`
          ${isMobile ? 'left-0 w-full' : 'left-[384px]'}
          ${isMobile && !showChat ? 'hidden' : 'block'}
          absolute top-0 bottom-0 right-0 z-0
        `}
      >
        {selectedUserId !== null ? (
          <ChatWindow
            conversation={selectedConversation}
            userId={selectedUserId}
            onBackClick={handleBackToList}
            isMobile={isMobile}
          />
        ) : (
          <DefaultView
            onStartConversation={handleSelectConversation}
            initialShowDiscover={showDiscover}
            onDiscoverClose={() => {
              setShowDiscover(false);
              if (isMobile) setShowChat(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
