// app/chat/layout.tsx
'use client';

import { ReactNode, useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import useUserPresence from '../../hooks/useUserPresence';
import { useTokenExpiry } from '../../hooks/useTokenExpiry';
import { CallProvider } from '@/context/CallContext';
import CallOverlay from '@/components/CallOverlay';
import ChatToast, { type ChatToastData } from '@/components/ChatToast';
import { playMessageSound, playReadSound, playTypingSound } from '@/hooks/useNotificationSound';
import type Pusher from 'pusher-js';

export default function ChatLayout({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<number | null>(null);
  const [recipientOnline, setRecipientOnline] = useState(false);
  const [toasts, setToasts] = useState<ChatToastData[]>([]);
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const addToast = (t: Omit<ChatToastData, 'id'>) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev.slice(-3), { ...t, id }]);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUserId(JSON.parse(userData).id);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;

    let pusher: Pusher | null = null;

    const init = async () => {
      const PusherModule = await import('pusher-js');
      const Pusher = PusherModule.default;
      pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        forceTLS: true,
        authEndpoint: `${process.env.NEXT_PUBLIC_API_URL}/api/chat/pusher/auth/`,
        auth: {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        },
      });

      const channel = pusher.subscribe(`user-${userId}-calls`);
      const convChannel = pusher.subscribe(`user-${userId}-conversations`);

      const onSuspended = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        alert('Votre compte a été suspendu.');
        router.replace('/');
      };

      channel.bind('account-suspended', onSuspended);
      convChannel.bind('account-suspended', onSuspended);

      // ── Notifications sonores + toasts ─────────────────────────
      // Nouveau message reçu (incrementUnread = vient d'un autre user)
      convChannel.bind('new-message', (data: {
        conversation: {
          id: number;
          name?: string;
          lastMessage?: string;
          incrementUnread?: boolean;
          user?: { profile?: { image?: string } };
        }
      }) => {
        if (data.conversation.incrementUnread) {
          playMessageSound();
          
          // On n'affiche le visuel (toast) QUE si on n'est pas déjà dans la discussion
          const isCurrentChat = pathnameRef.current.includes(`/chat/${data.conversation.id}`);
          if (!isCurrentChat) {
            addToast({
              type: 'message',
              title: data.conversation.name || 'Nouveau message',
              body: data.conversation.lastMessage || '',
              avatar: data.conversation.user?.profile?.image,
            });
          }
        }
      });

      // Message vu
      convChannel.bind('messages-read-sidebar', (data: {
        conversation_id: number;
        lastMessageIsRead?: boolean;
        conversation_name?: string;
        conversation_avatar?: string;
      }) => {
        if (data.lastMessageIsRead) {
          playReadSound();
        }
      });

      // En train d'écrire
      convChannel.bind('typing', (data: {
        conversation_id: number;
        userId: number;
        username: string;
        display_name?: string;
        isTyping: boolean;
        avatar?: string;
      }) => {
        if (data.isTyping) {
          playTypingSound();
        }
      });
    };

    void init();

    return () => {
      pusher?.disconnect();
    };
  }, [router, userId]);

  useUserPresence(userId, setRecipientOnline);
  useTokenExpiry();

  return (
    <CallProvider>
      {/* Toasts toujours visibles, même sur mobile */}
      <ChatToast toasts={toasts} onDismiss={dismissToast} />
      <div className="flex h-[100dvh] overflow-hidden">
        {children}
      </div>
      <CallOverlay />
    </CallProvider>
  );
}
