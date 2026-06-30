// src/app/chat/page.tsx
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Sidebar from '@/app/components/conversations/Sidebar';
import ChatWindow from '@/app/components/conversations/ChatWindow';
import DefaultView from '@/app/components/conversations/DefaultView';
import OnlineUsersView from '@/app/components/conversations/OnlineUsersView';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/axiosClient';
import {
  pushChatLayer,
  replaceChatRoot,
  stayOnChatRoot,
} from '@/lib/chatNavigation';

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
    <Suspense fallback={<div className="h-[100dvh] w-full bg-[var(--blue)]" />}>
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
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);
  const [sidebarView, setSidebarView] = useState<'chats' | 'calls'>('chats');
  const router = useRouter();
  const searchParams = useSearchParams();

  // Garde d'auth : pas de token → login
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.replace('/');
    } else {
      replaceChatRoot();
    }
  }, [router]);

  // Détecter mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Retour navigateur / téléphone : rester dans l'app
  useEffect(() => {
    const onPopState = () => {
      if (isMobile && showChat && selectedUserId !== null) {
        setShowChat(false);
        setSelectedUserId(null);
        setSelectedConversation(null);
        return;
      }

      if (showDiscover) {
        setShowDiscover(false);
        if (isMobile) setShowChat(false);
        return;
      }

      if (showOnlineUsers) {
        setShowOnlineUsers(false);
        if (isMobile) setShowChat(false);
        return;
      }

      if (sidebarView === 'calls') {
        setSidebarView('chats');
        return;
      }

      // Racine chat : ne pas retomber sur la page login
      stayOnChatRoot();
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [isMobile, showChat, selectedUserId, showDiscover, showOnlineUsers, sidebarView]);

  // Lire les query params et ouvrir directement la conversation
  useEffect(() => {
    const uId = searchParams.get('userId');

    if (!uId) return;

    const userIdNum = parseInt(uId, 10);
    if (isNaN(userIdNum)) return;

    const openConversation = async () => {
      try {
        const { data } = await api.post('/api/chat/conversations/create/', {
          user_id: userIdNum,
        });

        setSelectedConversation(data);
        setSelectedUserId(userIdNum);
        if (isMobile) {
          setShowChat(true);
          pushChatLayer('conversation');
        }

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
    setShowOnlineUsers(false);
    setSidebarView('chats');
    if (isMobile) {
      setShowChat(true);
      pushChatLayer('conversation');
    }
  };

  const handleBackToList = useCallback(() => {
    if (isMobile && showChat) {
      window.history.back();
      return;
    }
    setShowChat(false);
    setSelectedUserId(null);
    setSelectedConversation(null);
  }, [isMobile, showChat]);

  const handleDiscover = () => {
    setSelectedUserId(null);
    setSelectedConversation(null);
    setShowDiscover(true);
    pushChatLayer('discover');
    if (isMobile) {
      setShowChat(true);
    }
  };

  const handleDiscoverClose = () => {
    if (showDiscover) {
      window.history.back();
      return;
    }
    setShowDiscover(false);
    if (isMobile) setShowChat(false);
  };

  const handleViewOnlineUsers = () => {
    if (isMobile) {
      setShowChat(true);
      setSelectedUserId(null);
      setSelectedConversation(null);
      setShowDiscover(false);
      setShowOnlineUsers(true);
      pushChatLayer('online');
    } else {
      setShowDiscover(false);
      setShowOnlineUsers(true);
      pushChatLayer('online');
    }
  };

  const handleOnlineUsersClose = () => {
    if (showOnlineUsers) {
      window.history.back();
      return;
    }
    setShowOnlineUsers(false);
    if (isMobile) setShowChat(false);
  };
  
  const handleOnlineUserClick = async (userId: number) => {
    try {
      const { data } = await api.post('/api/chat/conversations/create/', { user_id: userId });
      setShowOnlineUsers(false);
      handleSelectConversation(data, userId);
    } catch (err) {
      console.error(err);
      router.push(`/chat?userId=${userId}`);
    }
  };

  const handleSidebarViewChange = (view: 'chats' | 'calls') => {
    if (view === 'calls') {
      setSidebarView('calls');
      pushChatLayer('calls');
      return;
    }
    if (sidebarView === 'calls') {
      window.history.back();
      return;
    }
    setSidebarView('chats');
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden">
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
          sidebarView={sidebarView}
          onSidebarViewChange={handleSidebarViewChange}
          onViewOnlineUsers={handleViewOnlineUsers}
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
        {showOnlineUsers ? (
          <OnlineUsersView
            onBackClick={handleOnlineUsersClose}
            onUserClick={handleOnlineUserClick}
          />
        ) : selectedUserId !== null ? (
          <div className="h-full min-h-0">
          <ChatWindow
            conversation={selectedConversation}
            userId={selectedUserId}
            onBackClick={handleBackToList}
            isMobile={isMobile}
          />
          </div>
        ) : (
          <DefaultView
            onStartConversation={handleSelectConversation}
            initialShowDiscover={showDiscover}
            onDiscoverClose={handleDiscoverClose}
          />
        )}
      </div>
    </div>
  );
}
