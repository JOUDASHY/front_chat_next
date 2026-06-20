'use client';

import { useEffect, useState } from 'react';
import { CallProvider } from '@/context/CallContext';
import CallOverlay from '@/components/CallOverlay';

function readAuthenticatedUserId(): number | null {
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem('accessToken');
  const userData = localStorage.getItem('user');
  if (!token || !userData) return null;

  try {
    const user = JSON.parse(userData) as { id?: number };
    return typeof user.id === 'number' ? user.id : null;
  } catch {
    return null;
  }
}

export default function AuthenticatedCallShell() {
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    const syncAuth = () => setUserId(readAuthenticatedUserId());

    syncAuth();
    window.addEventListener('storage', syncAuth);
    window.addEventListener('auth-changed', syncAuth);

    return () => {
      window.removeEventListener('storage', syncAuth);
      window.removeEventListener('auth-changed', syncAuth);
    };
  }, []);

  if (!userId) return null;

  return (
    <CallProvider>
      <CallOverlay />
    </CallProvider>
  );
}
