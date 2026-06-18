'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import api from '@/lib/axiosClient';
import { getDisplayName, getUsernameHandle } from '@/lib/userUtils';

interface OnlineUser {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  profile?: { image?: string };
}

function getImageUrl(image?: string) {
  if (!image) return '/default-avatar.svg';
  return image.startsWith('http') ? image : `${process.env.NEXT_PUBLIC_API_URL}${image}`;
}

export default function OnlineUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pusherRef = useRef<{ disconnect: () => void } | null>(null);

  const fetchOnlineUsers = useCallback(async () => {
    try {
      const { data } = await api.get<OnlineUser[]>('/api/chat/users/online/');
      setUsers(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch online users:', err);
      setError('Impossible de charger les utilisateurs en ligne.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.replace('/');
      return;
    }

    void fetchOnlineUsers();
  }, [router, fetchOnlineUsers]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    let cancelled = false;

    const initPusher = async () => {
      const PusherModule = await import('pusher-js');
      const Pusher = PusherModule.default;
      if (cancelled) return;

      const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        forceTLS: true,
        authEndpoint: `${process.env.NEXT_PUBLIC_API_URL}/api/chat/pusher/auth/`,
        auth: {
          headers: { Authorization: `Bearer ${token}` },
        },
      });

      pusherRef.current = pusher;
      const presenceChannel = pusher.subscribe('presence-channel');

      const refresh = () => {
        void fetchOnlineUsers();
      };

      presenceChannel.bind('pusher:subscription_succeeded', refresh);
      presenceChannel.bind('pusher:member_added', refresh);
      presenceChannel.bind('pusher:member_removed', refresh);
    };

    void initPusher();

    return () => {
      cancelled = true;
      pusherRef.current?.disconnect();
      pusherRef.current = null;
    };
  }, [fetchOnlineUsers]);

  const sortedUsers = useMemo(
    () =>
      [...users].sort((a, b) =>
        getDisplayName(a).localeCompare(getDisplayName(b), 'fr', { sensitivity: 'base' })
      ),
    [users]
  );

  const handleUserClick = (userId: number) => {
    router.push(`/chat?userId=${userId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 px-3 py-2.5 md:px-4 md:py-3 bg-blue border-b border-blue/20 shadow-sm">
        <button
          type="button"
          onClick={() => router.push('/chat')}
          className="p-1.5 md:p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Retour"
        >
          <ArrowLeftIcon className="h-5 w-5 text-white" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base md:text-lg font-bold text-white truncate">En ligne</h1>
          <p className="text-xs text-white/70">
            {loading ? 'Chargement…' : `${sortedUsers.length} utilisateur${sortedUsers.length > 1 ? 's' : ''}`}
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="h-8 w-8 rounded-full border-2 border-blue/20 border-t-blue animate-spin" />
            <p className="text-sm text-gray-500">Chargement des utilisateurs en ligne…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
            <p className="text-sm text-red-500">{error}</p>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                void fetchOnlineUsers();
              }}
              className="text-sm font-medium text-blue hover:underline"
            >
              Réessayer
            </button>
          </div>
        ) : sortedUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
            <p className="text-sm text-gray-500">Aucun utilisateur en ligne pour le moment.</p>
            <button
              type="button"
              onClick={() => router.push('/chat')}
              className="text-sm font-medium text-blue hover:underline"
            >
              Retour à la messagerie
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 bg-white">
            {sortedUsers.map((onlineUser) => (
              <li key={onlineUser.id}>
                <button
                  type="button"
                  onClick={() => handleUserClick(onlineUser.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="relative shrink-0">
                    <img
                      src={getImageUrl(onlineUser.profile?.image)}
                      alt={getDisplayName(onlineUser)}
                      className="h-11 w-11 rounded-full object-cover border-2 border-blue/20"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/default-avatar.svg';
                      }}
                    />
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold color-blue truncate">
                      {getDisplayName(onlineUser)}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {getUsernameHandle(onlineUser)}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
