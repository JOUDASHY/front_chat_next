// app/chat/layout.tsx
'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useUserPresence from '../../hooks/useUserPresence';
import { useTokenExpiry } from '../../hooks/useTokenExpiry';
import { CallProvider } from '@/context/CallContext';
import CallOverlay from '@/components/CallOverlay';
import type Pusher from 'pusher-js';

export default function ChatLayout({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<number | null>(null);
  const [recipientOnline, setRecipientOnline] = useState(false);
  const router = useRouter();

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
      <div className="flex h-[100dvh] overflow-hidden">
        {children}
        <CallOverlay />
      </div>
    </CallProvider>
  );
}
