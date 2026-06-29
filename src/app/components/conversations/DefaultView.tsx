'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import api from '@/lib/axiosClient';
import {
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  SparklesIcon,
  ArrowRightIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { CheckBadgeIcon } from '@heroicons/react/24/solid';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
interface SuggestedUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  is_online?: boolean;
  profile?: {
    image: string | null;
    bio: string | null;
    lieu: string | null;
    profession: string | null;
    status: string | null;
    is_verified?: boolean;
    gender?: string | null;
    language_preference?: string | null;
  };
}

interface Conversation {
  id: number;
  name: string;
  lastMessage: string;
  timestamp: string;
  isGroup: boolean;
  userId?: number;
  user: { profile?: { image?: string } } | null;
}

interface Props {
  onStartConversation: (conv: Conversation, userId: number) => void;
  initialShowDiscover?: boolean;
  onDiscoverClose?: () => void;
}

const STATUS_DOT: Record<string, string> = {
  online: 'bg-emerald-500',
  away:   'bg-amber-400',
  busy:   'bg-red-500',
};

/* ─────────────────────────────────────────────
   Composant principal
───────────────────────────────────────────── */
export default function DefaultView({
  onStartConversation,
  initialShowDiscover = false,
  onDiscoverClose,
}: Props) {
  const [showDiscover, setShowDiscover] = useState(initialShowDiscover);

  useEffect(() => {
    setShowDiscover(initialShowDiscover);
  }, [initialShowDiscover]);

  const handleCloseDiscover = () => {
    setShowDiscover(false);
    onDiscoverClose?.();
  };

  return (
    <div className="h-full w-full relative overflow-hidden">
      {/* Page de bienvenue */}
      <AnimatePresence>
        {!showDiscover && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0"
          >
            <WelcomePage onDiscover={() => setShowDiscover(true)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page découverte */}
      <AnimatePresence>
        {showDiscover && (
          <motion.div
            key="discover"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0"
          >
            <DiscoverPage
              onStartConversation={onStartConversation}
              onBack={handleCloseDiscover}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Page Bienvenue (original amélioré)
───────────────────────────────────────────── */
function WelcomePage({ onDiscover }: { onDiscover: () => void }) {
  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--blue)] overflow-hidden relative">
      {/* Blobs fond */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-[50vw] h-[50vw] bg-[var(--blue-ciel)] rounded-full blur-[150px] opacity-20 -left-[15%] -top-[15%] animate-pulse" />
        <div className="absolute w-[50vw] h-[50vw] bg-[var(--jaune)] rounded-full blur-[150px] opacity-20 -right-[15%] -bottom-[15%] animate-pulse [animation-delay:1s]" />
      </div>

      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center py-10 px-6">
        <div className="w-full max-w-lg mx-auto flex flex-col items-center">

          {/* Icône animée */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="mb-6"
          >
            <div className="p-5 bg-[var(--jaune)]/20 rounded-3xl border border-[var(--jaune)]/30">
              <ChatBubbleLeftRightIcon className="w-16 h-16 text-[var(--jaune)]" />
            </div>
          </motion.div>

          {/* Titre */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-2xl md:text-3xl font-extrabold text-white text-center mb-3 leading-tight"
          >
            Bienvenue dans votre<br />
            <span className="text-[var(--jaune)]">espace de discussion</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-white/60 text-sm text-center mb-8 max-w-xs"
          >
            Sélectionnez une conversation existante ou découvrez de nouvelles personnes à rencontrer.
          </motion.p>

          {/* Carte action */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 space-y-4"
          >
            {/* Bouton Découvrir */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onDiscover}
              className="w-full flex items-center justify-between gap-3
                         bg-[var(--jaune)] hover:bg-[var(--jaune)]/90
                         text-white font-bold px-5 py-3.5 rounded-xl
                         transition-all shadow-lg shadow-[var(--jaune)]/20"
            >
              <div className="flex items-center gap-2">
                <UserGroupIcon className="h-5 w-5" />
                <span>Découvrir des personnes</span>
              </div>
              <ArrowRightIcon className="h-4 w-4 opacity-80" />
            </motion.button>

            <p className="text-white/40 text-xs text-center">
              ou sélectionnez une conversation dans la barre latérale
            </p>
          </motion.div>

          {/* Statut connecté */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 flex items-center gap-2 text-white/50 text-xs"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Connecté · Prêt à discuter
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Page Découverte
───────────────────────────────────────────── */
function DiscoverPage({
  onStartConversation,
  onBack,
}: {
  onStartConversation: (conv: Conversation, userId: number) => void;
  onBack: () => void;
}) {
  const router = useRouter();
  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('');
  const [starting, setStarting] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: number } | null>(null);
  // Surcouche temps réel : map userId → true/false (online)
  const [onlineOverride, setOnlineOverride] = useState<Map<number, boolean>>(new Map());

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setCurrentUser(JSON.parse(stored));
  }, []);

  useEffect(() => {
    api.get('/api/chat/users/')
      .then(({ data }) => setUsers(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Pusher : synchro temps réel avec le presence-channel
  useEffect(() => {
    let pusherInstance: any = null;
    let isMounted = true;

    const init = async () => {
      const PusherModule = await import('pusher-js');
      const Pusher = PusherModule.default;
      if (!isMounted) return;

      pusherInstance = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        forceTLS: true,
        authEndpoint: `${process.env.NEXT_PUBLIC_API_URL}/api/chat/pusher/auth/`,
        auth: {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        },
      });

      const ch = pusherInstance.subscribe('presence-channel');

      // Initialisation : marquer tous les membres actuellement en ligne
      ch.bind('pusher:subscription_succeeded', (data: any) => {
        if (!isMounted) return;
        const ids = Object.keys(data.members).map(Number);
        setOnlineOverride(prev => {
          const next = new Map(prev);
          ids.forEach(id => next.set(id, true));
          return next;
        });
      });

      ch.bind('pusher:member_added', (member: any) => {
        if (!isMounted) return;
        setOnlineOverride(prev => new Map(prev).set(Number(member.id), true));
      });

      ch.bind('pusher:member_removed', (member: any) => {
        if (!isMounted) return;
        setOnlineOverride(prev => {
          const next = new Map(prev);
          next.set(Number(member.id), false);
          return next;
        });
      });
    };

    void init();

    return () => {
      isMounted = false;
      pusherInstance?.disconnect();
    };
  }, []);

  const filtered = users.filter(u => {
    if (u.id === currentUser?.id) return false;
    
    // Filtre par genre (sexe)
    if (filterGender && u.profile?.gender !== filterGender) return false;
    
    // Filtre par langue
    if (filterLanguage && u.profile?.language_preference !== filterLanguage) return false;

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      (u.first_name + ' ' + u.last_name).toLowerCase().includes(q) ||
      (u.profile?.profession || '').toLowerCase().includes(q) ||
      (u.profile?.lieu || '').toLowerCase().includes(q)
    );
  });

  // Source de vérité unique : presence-channel Pusher, exactement comme la Sidebar
  // true = Pusher confirme en ligne | false/absent = hors ligne
  const isOnlineRealtime = (id: number) => onlineOverride.get(id) === true;

  const online = filtered.filter(u => isOnlineRealtime(u.id));
  const others = filtered.filter(u => !isOnlineRealtime(u.id));

  const handleStart = async (user: SuggestedUser) => {
    if (starting) return;
    setStarting(user.id);
    try {
      const { data } = await api.post('/api/chat/conversations/create/', { user_id: user.id });
      onStartConversation(data, user.id);
    } catch {
      router.push(`/chat?userId=${user.id}`);
    } finally {
      setStarting(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#f0f2f5] dark:bg-gray-900 overflow-hidden">

      {/* Header */}
      <div className="relative bg-[var(--blue)] px-5 pt-6 pb-12 shrink-0 overflow-hidden">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-[var(--blue-ciel)]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-[var(--jaune)]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Retour"
            >
              <XMarkIcon className="h-4 w-4 text-white" />
            </button>
            <div>
              <h1 className="text-white font-extrabold text-lg leading-tight">Découvrir des personnes</h1>
              <p className="text-white/50 text-xs mt-0.5">Démarre une nouvelle conversation</p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-col items-end gap-1">
            <span className="text-[11px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-semibold">
              🟢 {online.length} en ligne
            </span>
            <span className="text-[11px] bg-white/10 text-white/60 px-2 py-0.5 rounded-full font-semibold">
              👥 {users.length} membres
            </span>
          </div>
        </div>
      </div>

      {/* Barre de recherche flottante */}
      <div className="px-4 -mt-5 relative z-10 shrink-0">
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-2xl shadow-md px-4 py-3 border border-[#f3f4f6] dark:border-[#374151]">
          <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Nom, profession, ville..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none bg-transparent"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
          )}
        </div>
      </div>

      {/* Filtres par genre (sexe) et par langue */}
      <div className="px-4 mt-3 flex gap-2 shrink-0">
        <select
          value={filterGender}
          onChange={e => setFilterGender(e.target.value)}
          className="flex-1 bg-white dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-200 rounded-xl px-3 py-2 border border-[#f3f4f6] dark:border-[#374151] shadow-sm outline-none"
        >
          <option value="">Tous les genres</option>
          <option value="M">Masculin</option>
          <option value="F">Féminin</option>
          <option value="O">Autre</option>
        </select>
        <select
          value={filterLanguage}
          onChange={e => setFilterLanguage(e.target.value)}
          className="flex-1 bg-white dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-200 rounded-xl px-3 py-2 border border-[#f3f4f6] dark:border-[#374151] shadow-sm outline-none"
        >
          <option value="">Toutes les langues</option>
          <option value="fr">Français</option>
          <option value="en">Anglais</option>
          <option value="es">Espagnol</option>
          <option value="mg">Malgache</option>
          <option value="de">Allemand</option>
          <option value="it">Italien</option>
          <option value="pt">Portugais</option>
          <option value="ru">Russe</option>
          <option value="zh">Chinois</option>
          <option value="ja">Japonais</option>
          <option value="ko">Coréen</option>
          <option value="ar">Arabe</option>
        </select>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-6 space-y-6">
        {loading ? (
          <SkeletonGrid />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <UserGroupIcon className="h-12 w-12 text-gray-300" />
            <p className="text-gray-400 text-sm">Aucun résultat{search ? ` pour "${search}"` : ''}</p>
          </div>
        ) : (
          <>
            {online.length > 0 && (
              <Section title="En ligne maintenant" icon={<SparklesIcon className="h-4 w-4 text-emerald-500" />}>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {online.map((u, i) => (
                    <UserCard key={u.id} user={u} index={i} onStart={handleStart} loading={starting === u.id} isOnline={true} />
                  ))}
                </div>
              </Section>
            )}
            {others.length > 0 && (
              <Section title="Autres membres" icon={<UserGroupIcon className="h-4 w-4 text-[var(--blue)]" />}>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {others.map((u, i) => (
                    <UserCard key={u.id} user={u} index={i} onStart={handleStart} loading={starting === u.id} isOnline={false} />
                  ))}
                </div>
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   UserCard
───────────────────────────────────────────── */
function UserCard({ user, index, onStart, loading, isOnline }: {
  user: SuggestedUser;
  index: number;
  onStart: (u: SuggestedUser) => void;
  loading: boolean;
  isOnline: boolean;
}) {
  const router = useRouter();
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.22 }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-[#f3f4f6] dark:border-[#374151] p-4
                 hover:shadow-md hover:border-[var(--blue-ciel)]/40 transition-all"
    >
      <div className="flex items-start gap-3">
        <button onClick={() => router.push(`/profile/${user.id}`)} className="relative shrink-0 focus:outline-none">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#f3f4f6] bg-gray-100">
            <img
              src={user.profile?.image || '/default-avatar.svg'}
              alt={user.username}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = '/default-avatar.svg'; }}
            />
          </div>
          <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${isOnline ? 'bg-emerald-500' : 'bg-gray-300'}`} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => router.push(`/profile/${user.id}`)}
              className="text-xs md:text-sm font-bold text-[var(--blue)] dark:text-gray-100 hover:underline truncate max-w-[130px]"
            >
              {fullName || user.username}
            </button>
            {user.profile?.is_verified && (
              <CheckBadgeIcon className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            )}
          </div>
          <p className="text-xs text-gray-400 truncate">@{user.username}</p>
          <div className="flex flex-wrap gap-x-2 mt-1">
            {user.profile?.profession && (
              <span className="text-[11px] text-gray-500 truncate max-w-[120px]">💼 {user.profile.profession}</span>
            )}
            {user.profile?.lieu && (
              <span className="text-[11px] text-gray-500 truncate max-w-[100px]">📍 {user.profile.lieu}</span>
            )}
          </div>
          {user.profile?.bio && (
            <p className="text-[11px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">{user.profile.bio}</p>
          )}
        </div>
      </div>

      {isOnline && (
        <div className="mt-2 inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          En ligne
        </div>
      )}

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => onStart(user)}
        disabled={loading}
        className="mt-3 w-full flex items-center justify-center gap-1.5
                   bg-[var(--blue)] hover:bg-[var(--blue-ciel)] text-white
                   text-xs font-semibold py-2 rounded-xl transition-all
                   disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <>
            <ChatBubbleLeftRightIcon className="h-3.5 w-3.5" />
            Envoyer un message
          </>
        )}
      </motion.button>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="text-sm font-bold text-[var(--blue)] dark:text-gray-200">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-[#f3f4f6] dark:border-[#374151] animate-pulse">
          <div className="flex gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
            </div>
          </div>
          <div className="mt-3 h-7 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        </div>
      ))}
    </div>
  );
}
