// frontend/hooks/useUserPresence.ts
'use client';

import { useEffect } from 'react';
import Pusher from 'pusher-js';
import api from '@/lib/axiosClient';

// This is a custom React hook
const useUserPresence = (userId: number | null, setRecipientOnline: (isOnline: boolean) => void) => {
  // useEffect is correctly used inside a custom hook
  useEffect(() => {
    // Safely check for window before accessing localStorage
    if (typeof window === 'undefined') return;
    
    // Get token from localStorage (only on client)
    const token = localStorage.getItem('accessToken');
    
    // Initialize Pusher
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      forceTLS: true,
      authEndpoint: `${process.env.NEXT_PUBLIC_API_URL}/api/chat/pusher/auth/`,
      auth: {
        headers: { Authorization: `Bearer ${token}` },
      },
    });
    
    // Subscribe to the presence channel
    const presenceChannel = pusher.subscribe('presence-channel');
    
    // Handle user status changes
    const handleUserStatusChanged = (data: { userId: number; isOnline: boolean }) => {
      if (data.userId === userId) {
        setRecipientOnline(data.isOnline);
      }
    };
    
    presenceChannel.bind('user-status-changed', handleUserStatusChanged);
    
    // Handle disconnection
    const handleDisconnect = () => {
      if (userId) {
        api.post('/api/chat/handle-disconnect/', { userId });
      }
    };
    
    window.addEventListener('beforeunload', handleDisconnect);
    window.addEventListener('unload', handleDisconnect);
    
    // Cleanup function
    return () => {
      presenceChannel.unbind('user-status-changed', handleUserStatusChanged);
      window.removeEventListener('beforeunload', handleDisconnect);
      window.removeEventListener('unload', handleDisconnect);
      pusher.disconnect();
    };
  }, [userId, setRecipientOnline]);
};

export default useUserPresence;
