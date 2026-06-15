// frontend/hooks/useUserPresence.ts
'use client';

import { useEffect } from 'react';
import api from '@/lib/axiosClient';

// This is a custom React hook
const useUserPresence = (userId: number | null, setRecipientOnline: (isOnline: boolean) => void) => {
  // useEffect is correctly used inside a custom hook
  useEffect(() => {
    // Safely check for window before accessing localStorage
    if (typeof window === 'undefined') return;
    
    let isMounted = true;
    let pusherInstance: any = null;
    let presenceChannel: any = null;
    
    const handleUserStatusChanged = (data: { userId: number; isOnline: boolean }) => {
      if (data.userId === userId) {
        setRecipientOnline(data.isOnline);
      }
    };
    
    const handleDisconnect = () => {
      if (userId) {
        api.post('/api/chat/handle-disconnect/', { userId });
      }
    };

    const initPusher = async () => {
      // Get token from localStorage (only on client)
      const token = localStorage.getItem('accessToken');
      
      const PusherModule = await import('pusher-js');
      const Pusher = PusherModule.default;
      
      if (!isMounted) return;
      
      // Initialize Pusher
      pusherInstance = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        forceTLS: true,
        authEndpoint: `${process.env.NEXT_PUBLIC_API_URL}/api/chat/pusher/auth/`,
        auth: {
          headers: { Authorization: `Bearer ${token}` },
        },
      });
      
      // Subscribe to the presence channel
      presenceChannel = pusherInstance.subscribe('presence-channel');
      presenceChannel.bind('user-status-changed', handleUserStatusChanged);
      
      window.addEventListener('beforeunload', handleDisconnect);
      window.addEventListener('unload', handleDisconnect);
    };
    
    initPusher();
    
    // Cleanup function
    return () => {
      isMounted = false;
      if (presenceChannel) {
        presenceChannel.unbind('user-status-changed', handleUserStatusChanged);
      }
      window.removeEventListener('beforeunload', handleDisconnect);
      window.removeEventListener('unload', handleDisconnect);
      if (pusherInstance) {
        pusherInstance.disconnect();
      }
    };
  }, [userId, setRecipientOnline]);
};

export default useUserPresence;
