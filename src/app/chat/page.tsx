// src/app/chat/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/app/components/conversations/Sidebar';
import ChatWindow from '@/app/components/conversations/ChatWindow';
import DefaultView from '@/app/components/conversations/DefaultView';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

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
  };
}

export default function ChatPage() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const router = useRouter();

  // Détecter si l'appareil est mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768); // 768px est généralement le breakpoint pour les tablettes
    };

    // Vérifier au chargement initial
    checkIfMobile();

    // Ajouter un écouteur pour les changements de taille d'écran
    window.addEventListener('resize', checkIfMobile);

    // Nettoyer l'écouteur lors du démontage du composant
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  const handleSelectConversation = (conversation: Conversation, userId: number) => {
    setSelectedConversation(conversation);
    setSelectedUserId(userId);
    
    // Sur mobile, afficher uniquement la fenêtre de chat
    if (isMobile) {
      setShowChat(true);
    }
  };

  const handleBackToList = () => {
    if (isMobile) {
      setShowChat(false);
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Sidebar - toujours visible sur desktop, visible uniquement quand showChat est false sur mobile */}
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
        />
      </div>
      
      {/* ChatWindow ou DefaultView - visible sur desktop, ou sur mobile quand showChat est true */}
      <div 
        className={`
          ${isMobile ? 'left-0 w-full' : 'left-[384px]'} 
          ${isMobile && !showChat ? 'hidden' : 'block'}
          absolute top-0 bottom-0 right-0 z-0
        `}
      >
        {selectedUserId !== null ? (
         // Dans la partie mobile du rendu
<ChatWindow 
  conversation={selectedConversation} 
  userId={selectedUserId} 
  onBackClick={handleBackToList} // Fonction qui change showChat à false
  isMobile={true}
/>

        ) : (
          <DefaultView />
        )}
      </div>
    </div>
  );
}
