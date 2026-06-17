// app/chat/layout.tsx
'use client';

import { ReactNode, useState, useEffect } from 'react';
import useUserPresence from '../../hooks/useUserPresence';
import { CallProvider } from '@/context/CallContext';
import CallOverlay from '@/components/CallOverlay';

export default function ChatLayout({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<number | null>(null);
  const [recipientOnline, setRecipientOnline] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUserId(JSON.parse(userData).id);
    }
  }, []);

  useUserPresence(userId, setRecipientOnline);

  return (
    <CallProvider>
      <div className="flex h-screen">
        {children}
        <CallOverlay />
      </div>
    </CallProvider>
  );
}
