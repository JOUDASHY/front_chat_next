'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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

function getImageUrl(image?: string, name?: string) {
  if (!image) return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=random`;
  return image.startsWith('http') ? image : `${process.env.NEXT_PUBLIC_API_URL}${image}`;
}

interface OnlineUsersViewProps {
  onBackClick: () => void;
  onUserClick: (userId: number) => void;
}

export default function OnlineUsersView({ onBackClick, onUserClick }: OnlineUsersViewProps) {
  // Tous les users connus (pour enrichir les membres Pusher avec avatar/nom)
  const [allUsers, setAllUsers] = useState<OnlineUser[]>([]);
  // Set des IDs vraiment en ligne selon Pusher presence-channel
  const [onlineIds, setOnlineIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const pusherRef = useRef<{ disconnect: () => void } | null>(null);
  const currentUserId = useRef<number | null>(null);

  // Charger la liste complète des users une seule fois pour avoir les profils
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) currentUserId.current = JSON.parse(stored).id;

    api.get<OnlineUser[]>('/api/chat/users/')
      .then(({ data }) => setAllUsers(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Source de vérité : presence-channel Pusher — même source que la Sidebar
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
        auth: { headers: { Authorization: `Bearer ${token}` } },
      });

      pusherRef.current = pusher;
      const ch = pusher.subscribe('presence-channel');

      // Initialisation : membres actuellement connectés dans le canal
      ch.bind('pusher:subscription_succeeded', (data: any) => {
        if (cancelled) return;
        const ids = new Set<number>(
          Object.values(data.members).map((m: any) => Number(m.id ?? m))
        );
        // Exclure soi-même
        if (currentUserId.current) ids.delete(currentUserId.current);
        setOnlineIds(ids);
        setLoading(false);
      });

      ch.bind('pusher:member_added', (member: any) => {
        if (cancelled) return;
        const id = Number(member.id);
        if (id === currentUserId.current) return;
        setOnlineIds(prev => new Set(prev).add(id));
      });

      ch.bind('pusher:member_removed', (member: any) => {
        if (cancelled) return;
        const id = Number(member.id);
        setOnlineIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      });
    };

    void initPusher();

    return () => {
      cancelled = true;
      pusherRef.current?.disconnect();
      pusherRef.current = null;
    };
  }, []);

  // Croiser les IDs Pusher avec les profils complets
  const onlineUsers = useMemo(() => {
    const result: OnlineUser[] = [];
    onlineIds.forEach(id => {
      const user = allUsers.find(u => u.id === id);
      if (user) {
        result.push(user);
      } else {
        // User pas encore dans allUsers — afficher avec id seulement
        result.push({ id, username: `user_${id}` });
      }
    });
    return result.sort((a, b) =>
      getDisplayName(a).localeCompare(getDisplayName(b), 'fr', { sensitivity: 'base' })
    );
  }, [onlineIds, allUsers]);

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <header className="sticky top-0 z-10 flex items-center gap-3 px-3 py-2.5 md:px-4 md:py-3 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800 shadow-sm shrink-0">
        <button
          type="button"
          onClick={onBackClick}
          className="p-1.5 md:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors md:hidden"
          aria-label="Retour"
        >
          <ArrowLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base md:text-lg font-bold text-[var(--blue)] dark:text-gray-100 truncate">En ligne</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {loading
              ? 'Connexion…'
              : `${onlineUsers.length} utilisateur${onlineUsers.length > 1 ? 's' : ''} en ligne`}
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
            <div className="h-8 w-8 rounded-full border-2 border-[var(--blue)]/20 dark:border-gray-700 border-t-[var(--blue)] dark:border-t-indigo-500 animate-spin" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Connexion au canal de présence…</p>
          </div>
        ) : onlineUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-16 px-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">Aucun autre utilisateur en ligne pour le moment.</p>
          </div>
        ) : (
          <ul className="bg-white dark:bg-gray-900">
            {onlineUsers.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => onUserClick(u.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left border-b border-gray-100/50 dark:border-gray-800 last:border-b-0"
                >
                  <div className="relative shrink-0">
                    <img
                      src={getImageUrl(u.profile?.image, getDisplayName(u))}
                      alt={getDisplayName(u)}
                      className="h-11 w-11 rounded-full object-cover border-2 border-[var(--blue)]/20 dark:border-gray-700 bg-[rgba(0,11,49,0.15)] dark:bg-white/20"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(getDisplayName(u))}&background=random`;
                      }}
                    />
                    {/* Dot vert — toujours affiché ici car tous sont en ligne */}
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-900" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--blue)] dark:text-gray-200 truncate">
                      {getDisplayName(u)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {getUsernameHandle(u)}
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
