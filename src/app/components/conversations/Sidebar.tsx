'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/axiosClient';
import { getDisplayName } from '@/lib/userUtils';
import Image from 'next/image';
import {
  UserGroupIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  ArrowLeftOnRectangleIcon,
  XMarkIcon,
  PlusIcon,
  PhoneIcon,
  ShieldCheckIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import CreateGroupModal from './CreateGroupModal';
import LoadingOverlay from '@/components/LoadingOverlay';


export interface Conversation {
  id: number;
  name: string;
  lastMessage: string;
  timestamp: string;
  isGroup: boolean;
  userId?: number;
  unreadCount: number;
  lastMessageSeen: boolean;
  lastMessageSenderId?: number;
  lastMessageIsRead?: boolean;
  user: { id?: number; profile?: { image?: string } } | null;
  participants?: { id: number; username: string; profile?: { image?: string } }[];
}

interface User {
  id: number;  // Changed from string | number
  name: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  profile?: {
    image: string;
    lieu: string | null;
    date_naiv: string | null;
    status: string | null;
    passion: string | null;
  };
}

interface SidebarProps {
  onSelectConversation: (conv: Conversation, userId: number) => void;
  activeConversationId?: number;
  onDiscover?: () => void;
  sidebarView?: 'chats' | 'calls';
  onSidebarViewChange?: (view: 'chats' | 'calls') => void;
  onViewOnlineUsers?: () => void;
}

const GroupAvatar = ({
  participants,
  name,
}: {
  participants?: { id: number; username: string; profile?: { image?: string } }[];
  name: string;
}) => {
  // Show up to 2 participant avatars overlapping, or a generic group icon
  const shown = (participants || []).slice(0, 2);
  if (shown.length === 0) {
    // Generic group icon
    return (
      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[var(--blue)] to-[var(--blue-ciel)] flex items-center justify-center shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
      </div>
    );
  }
  return (
    <div className="relative h-10 w-10 shrink-0">
      {shown.length === 1 ? (
        <Avatar
          src={shown[0].profile?.image}
          alt={shown[0].username}
          className="h-10 w-10 bg-blue/20"
        />
      ) : (
        <>
          {/* bottom-right: second participant */}
          <div className="absolute bottom-0 right-0 h-6 w-6 rounded-full overflow-hidden border-2 border-white z-10">
            <Avatar src={shown[1].profile?.image} alt={shown[1].username} className="h-full w-full bg-blue/20" />
          </div>
          {/* top-left: first participant */}
          <div className="absolute top-0 left-0 h-6 w-6 rounded-full overflow-hidden border-2 border-white z-20">
            <Avatar src={shown[0].profile?.image} alt={shown[0].username} className="h-full w-full bg-blue/20" />
          </div>
        </>
      )}
    </div>
  );
};

const Avatar = ({ src, alt = '', className = '', isOnline = false, dark = false }: { src?: string; alt?: string; className?: string; isOnline?: boolean; dark?: boolean }) => {
  const [hasError, setHasError] = useState(false);
  const initials = alt ? alt.split(' ').map((n) => n[0]).join('').toUpperCase() : '';
  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(alt || 'User')}&background=random`;
  const displaySrc = !src ? fallback : src;

  // Couleurs adaptées selon le fond (clair ou sombre)
  const fallbackBg = dark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 11, 49, 0.15)';
  const fallbackColor = dark ? '#ffffff' : 'var(--blue)';

  return (
    <div className="relative">
      {hasError ? (
        <div
          className={`rounded-full flex items-center justify-center ${className}`}
          style={{ backgroundColor: fallbackBg }}
        >
          {initials ? (
            <span className="font-semibold text-sm" style={{ color: fallbackColor }}>{initials}</span>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3/5 h-3/5" style={{ color: fallbackColor }}>
              <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
              </svg>
          )}
        </div>
      ) : (
        <div className={`relative overflow-hidden ${className}`} style={{ borderRadius: '50%' }}>
          <Image
            key={displaySrc}
            src={displaySrc}
            alt={alt}
            width={40}
            height={40}
            className="object-cover w-full h-full"
            priority
            quality={75}
            style={{ width: '100%', height: '100%' }}
            onError={() => setHasError(true)}
          />
        </div>
      )}
      {isOnline && (
        <span className="absolute bottom-1 right-0 translate-x-1/3 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></span>
      )}
    </div>
  );
};

interface TypingUser {
  userId: number;
  displayName: string;
}

function getSidebarTypingText(users: TypingUser[], isGroup: boolean): string {
  if (users.length === 0) return '';
  if (!isGroup) return 'En train d\'écrire';
  if (users.length === 1) return `${users[0].displayName} écrit`;
  if (users.length === 2) return `${users[0].displayName} et ${users[1].displayName} écrivent`;
  return 'Plusieurs personnes écrivent';
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-0.5 ml-0.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block h-1 w-1 rounded-full bg-[var(--blue)] animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  );
}

interface CallHistoryItem {
  id: number;
  preview: string;
  call_type: 'audio' | 'video';
  status: string;
  direction: 'incoming' | 'outgoing';
  duration_seconds: number;
  started_at: string;
  peer: {
    id: number;
    display_name: string;
    username: string;
    image?: string | null;
  };
}

export default function Sidebar({
  onSelectConversation,
  activeConversationId,
  onDiscover,
  sidebarView: sidebarViewProp,
  onSidebarViewChange,
  onViewOnlineUsers,
}: SidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Map<number, boolean>>(new Map());  // Changed from Map<string | number, boolean>
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const allUsersRef = useRef<User[]>([]);
  const [isPusherReady, setIsPusherReady] = useState(false);
  const [sidebarViewInternal, setSidebarViewInternal] = useState<'chats' | 'calls'>('chats');
  const sidebarView = sidebarViewProp ?? sidebarViewInternal;
  const setSidebarView = (view: 'chats' | 'calls') => {
    if (onSidebarViewChange) {
      onSidebarViewChange(view);
    } else {
      setSidebarViewInternal(view);
    }
  };
  const [callHistory, setCallHistory] = useState<CallHistoryItem[]>([]);
  const [callsLoading, setCallsLoading] = useState(false);
  const [callsError, setCallsError] = useState<string | null>(null);
  const [typingInConversations, setTypingInConversations] = useState<Map<number, TypingUser[]>>(new Map());
  const [isStaff, setIsStaff] = useState(false);
  const router = useRouter();

  // Référence pour stocker l'instance Pusher
  const pusherRef = useRef<any>(null);
  const typingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Initialiser Pusher
  useEffect(() => {
    let isMounted = true;
    
    const initPusher = async () => {
      if (!pusherRef.current) {
        const PusherModule = await import('pusher-js');
        const Pusher = PusherModule.default;
        
        if (!isMounted) return;
        
        // @ts-ignore
        Pusher.logToConsole = true;
        const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
          cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
          forceTLS: true,
          authEndpoint: `${process.env.NEXT_PUBLIC_API_URL}/api/chat/pusher/auth/`,
          auth: {
            headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
          },
        });

        pusherRef.current = pusher;
        setIsPusherReady(true);
      }
    };
    
    initPusher();

    return () => {
      isMounted = false;
      pusherRef.current?.disconnect();
    };
  }, []);

  // Charger les conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const { data } = await api.get<Conversation[]>('/api/chat/conversations/');
        setConversations(data);
        setError(null);
      } catch (err) {
        setError('Échec du chargement des conversations');
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, []);

  const fetchCallHistory = async () => {
    setCallsLoading(true);
    setCallsError(null);
    try {
      const { data } = await api.get<CallHistoryItem[]>('/api/chat/calls/history/');
      setCallHistory(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      console.error('Failed to fetch call history:', err);
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        setCallsError('Historique non disponible — mettez à jour le serveur backend.');
      } else if (status === 500) {
        setCallsError('Erreur serveur — exécutez la migration : python manage.py migrate');
      } else {
        setCallsError('Impossible de charger l\'historique des appels.');
      }
      setCallHistory([]);
    } finally {
      setCallsLoading(false);
    }
  };

  useEffect(() => {
    if (sidebarView === 'calls') {
      void fetchCallHistory();
    }
  }, [sidebarView]);

  useEffect(() => {
    const onHistoryChanged = () => {
      if (sidebarView === 'calls') {
        void fetchCallHistory();
      }
    };
    window.addEventListener('call-history-changed', onHistoryChanged);
    return () => window.removeEventListener('call-history-changed', onHistoryChanged);
  }, [sidebarView]);

  // Charger l'utilisateur depuis localStorage
  useEffect(() => {
    const fetchUserFromLocalStorage = () => {
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setIsStaff(Boolean(parsedUser.is_staff));
      }
    };

    fetchUserFromLocalStorage();

    api.get<{ is_staff?: boolean }>('/api/chat/me/')
      .then(({ data }) => setIsStaff(Boolean(data.is_staff)))
      .catch(() => {});
  }, []);

  // Charger tous les utilisateurs
  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        const { data } = await api.get<User[]>('/api/chat/users/');
        setAllUsers(data);
      } catch (err) {
        console.error('Failed to fetch users:', err);
      }
    };
    fetchAllUsers();
  }, []);

  useEffect(() => {
    allUsersRef.current = allUsers;
  }, [allUsers]);

  const enrichConversation = (conv: Conversation): Conversation => {
    if (conv.isGroup || conv.name) return conv;

    const peerId = conv.userId ?? conv.lastMessageSenderId ?? conv.user?.id;
    if (!peerId) return conv;

    const peer = allUsersRef.current.find(u => u.id === peerId);
    if (!peer) return conv;

    return {
      ...conv,
      name: conv.name || getDisplayName(peer),
      userId: conv.userId ?? peer.id,
      user: conv.user ?? { profile: peer.profile ? { image: peer.profile.image } : undefined },
    };
  };

  const refreshConversationFromApi = async (conversationId: number) => {
    try {
      const { data } = await api.get<Conversation[]>('/api/chat/conversations/');
      const full = data.find(c => c.id === conversationId);
      if (!full) return;
      setConversations(prev =>
        prev.map(c => (c.id === conversationId ? { ...c, ...full } : c))
      );
    } catch (err) {
      console.error('Failed to refresh conversation:', err);
    }
  };

  const clearConversationTyping = (conversationId: number) => {
    setTypingInConversations((prev) => {
      if (!prev.has(conversationId)) return prev;
      const next = new Map(prev);
      next.delete(conversationId);
      return next;
    });
    for (const [key, timeoutId] of typingTimeoutsRef.current.entries()) {
      if (key.startsWith(`${conversationId}-`)) {
        clearTimeout(timeoutId);
        typingTimeoutsRef.current.delete(key);
      }
    }
  };

  const handleSidebarTyping = (data: {
    conversation_id: number;
    userId: number;
    username: string;
    display_name?: string;
    isTyping: boolean;
  }) => {
    if (data.userId === user?.id) return;

    const convId = data.conversation_id;
    const key = `${convId}-${data.userId}`;
    const existingTimeout = typingTimeoutsRef.current.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      typingTimeoutsRef.current.delete(key);
    }

    const displayName = data.display_name || data.username;

    setTypingInConversations((prev) => {
      const next = new Map(prev);
      const current = next.get(convId) || [];

      if (data.isTyping) {
        const updated = current.some((u) => u.userId === data.userId)
          ? current.map((u) =>
              u.userId === data.userId ? { ...u, displayName } : u
            )
          : [...current, { userId: data.userId, displayName }];
        next.set(convId, updated);

        typingTimeoutsRef.current.set(
          key,
          setTimeout(() => {
            setTypingInConversations((p) => {
              const n = new Map(p);
              const list = (n.get(convId) || []).filter((u) => u.userId !== data.userId);
              if (list.length) n.set(convId, list);
              else n.delete(convId);
              return n;
            });
            typingTimeoutsRef.current.delete(key);
          }, 3000)
        );
      } else {
        const updated = current.filter((u) => u.userId !== data.userId);
        if (updated.length) next.set(convId, updated);
        else next.delete(convId);
      }

      return next;
    });
  };

  // S'abonner aux canaux Pusher pour les mises à jour des conversations
  useEffect(() => {
    if (!isPusherReady || !pusherRef.current || !user) return;

    // S'abonner au canal de l'utilisateur pour les mises à jour de conversations
    const channel = pusherRef.current.subscribe(`user-${user.id}-conversations`);

    // Écouter les nouveaux messages
    channel.bind('new-message', (data: { conversation: Conversation & { incrementUnread?: boolean } }) => {
      clearConversationTyping(data.conversation.id);

      setConversations(prev => {
        // Trouver si la conversation existe déjà
        const existingIndex = prev.findIndex(conv => conv.id === data.conversation.id);

        if (existingIndex >= 0) {
          // Mettre à jour la conversation existante
          const updated = [...prev];
          
          const newUnreadCount = data.conversation.incrementUnread 
            ? (updated[existingIndex].unreadCount || 0) + 1 
            : updated[existingIndex].unreadCount;
            
          const newLastMessageSeen = data.conversation.lastMessageSeen !== undefined 
            ? data.conversation.lastMessageSeen 
            : updated[existingIndex].lastMessageSeen;
            
          const newLastMessageSenderId = data.conversation.lastMessageSenderId !== undefined 
            ? data.conversation.lastMessageSenderId 
            : updated[existingIndex].lastMessageSenderId;
            
          // Protection contre les events Pusher reçus dans le désordre
          const isOlderOrSame = new Date(data.conversation.timestamp).getTime() <= new Date(updated[existingIndex].timestamp).getTime();
          
          let newLastMessageIsRead = data.conversation.lastMessageIsRead !== undefined 
            ? data.conversation.lastMessageIsRead 
            : updated[existingIndex].lastMessageIsRead;
            
          if (isOlderOrSame && updated[existingIndex].lastMessageIsRead === true) {
             newLastMessageIsRead = true; // On garde true si le message n'est pas plus récent
          }

          updated[existingIndex] = {
            ...updated[existingIndex],
            lastMessage: data.conversation.lastMessage,
            timestamp: data.conversation.timestamp,
            unreadCount: newUnreadCount,
            lastMessageSeen: newLastMessageSeen,
            lastMessageSenderId: newLastMessageSenderId,
            lastMessageIsRead: newLastMessageIsRead
          };

          // Trier les conversations par timestamp (plus récent en premier)
          return updated.sort((a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
        } else {
          // Ajouter la nouvelle conversation au début
          const incoming = enrichConversation({
            ...data.conversation,
            unreadCount: data.conversation.incrementUnread ? 1 : 0,
          });

          if (!incoming.isGroup && !incoming.name) {
            refreshConversationFromApi(incoming.id);
          }

          return [incoming, ...prev];
        }
      });
    });

    channel.bind('typing', (data: {
      conversation_id: number;
      userId: number;
      username: string;
      display_name?: string;
      isTyping: boolean;
    }) => {
      handleSidebarTyping(data);
    });

    // Écouter les nouvelles conversations
    channel.bind('new-conversation', (data: { conversation: Conversation }) => {
      setConversations(prev => {
        // Vérifier si la conversation existe déjà
        const exists = prev.some(conv => conv.id === data.conversation.id);
        if (!exists) {
          // Ajouter la nouvelle conversation au début
          return [data.conversation, ...prev];
        }
        return prev;
      });
    });

    // Écouter le signal que les messages ont été lus
    channel.bind('messages-read-sidebar', (data: { conversation_id: number; reset_unread: boolean; lastMessageIsRead?: boolean }) => {
      setConversations(prev => {
        const idx = prev.findIndex(c => c.id === data.conversation_id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            lastMessageSeen: true,
            unreadCount: data.reset_unread ? 0 : updated[idx].unreadCount,
            lastMessageIsRead: data.lastMessageIsRead !== undefined ? data.lastMessageIsRead : updated[idx].lastMessageIsRead
          };
          return updated;
        }
        return prev;
      });
    });

    // S'abonner au canal de présence pour le statut en ligne
    const presenceChannel = pusherRef.current.subscribe('presence-channel');

    presenceChannel.bind('pusher:subscription_succeeded', (data: any) => {
      const onlineUserIds = new Set(Object.keys(data.members).map(id => data.members[id].id));
      setOnlineUsers(prev => {
        const newMap = new Map(prev);
        onlineUserIds.forEach(id => newMap.set(id, true));
        return newMap;
      });
    });

    presenceChannel.bind('pusher:member_added', (member: any) => {
      setOnlineUsers(prev => new Map(prev).set(member.id, true));
    });

    presenceChannel.bind('pusher:member_removed', (member: any) => {
      setOnlineUsers(prev => {
        const newMap = new Map(prev);
        newMap.delete(member.id);
        return newMap;
      });
    });

    return () => {
      channel.unbind_all();
      pusherRef.current?.unsubscribe(`user-${user.id}-conversations`);
      presenceChannel.unbind_all();
      pusherRef.current?.unsubscribe('presence-channel');
      typingTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      typingTimeoutsRef.current.clear();
    };
  }, [user, isPusherReady]);

  // Écouter la frappe sur chaque conversation (temps réel dans la sidebar)
  useEffect(() => {
    if (!isPusherReady || !pusherRef.current || !user) return;

    const parseConversationId = (channelName: string): number | null => {
      if (channelName.startsWith('private-chat-')) {
        const parts = channelName.replace('private-chat-', '').split('-');
        if (parts.length !== 2) return null;
        return parseInt(`${parts[0]}${parts[1]}`, 10);
      }
      if (channelName.startsWith('group-chat-')) {
        return parseInt(channelName.replace('group-chat-', ''), 10);
      }
      return null;
    };

    const channelNames = new Set<string>();
    conversations.forEach((conv) => {
      if (conv.isGroup) {
        channelNames.add(`group-chat-${conv.id}`);
      } else {
        const peerId = conv.userId ?? conv.user?.id;
        if (peerId) {
          const a = Math.min(user.id, peerId);
          const b = Math.max(user.id, peerId);
          channelNames.add(`private-chat-${a}-${b}`);
        }
      }
    });

    const subscribed: { name: string; channel: { unbind: (event: string) => void } }[] = [];

    channelNames.forEach((channelName) => {
      const convId = parseConversationId(channelName);
      if (!convId) return;

      const channel = pusherRef.current.subscribe(channelName);
      channel.bind(
        'typing',
        (data: { userId: number; username: string; isTyping: boolean; display_name?: string }) => {
          const peer = allUsersRef.current.find((u) => u.id === data.userId);
          handleSidebarTyping({
            conversation_id: convId,
            userId: data.userId,
            username: data.username,
            display_name: data.display_name || (peer ? getDisplayName(peer) : data.username),
            isTyping: data.isTyping,
          });
        }
      );
      subscribed.push({ name: channelName, channel });
    });

    return () => {
      subscribed.forEach(({ name, channel }) => {
        channel.unbind('typing');
        pusherRef.current?.unsubscribe(name);
      });
    };
  }, [conversations, isPusherReady, user?.id]);

  // Écouter les messages envoyés par le sender (ChatWindow) pour mettre à jour la sidebar localement
  useEffect(() => {
    const handleMessageSent = (event: Event) => {
      const { conversationId, lastMessage, timestamp } = (event as CustomEvent).detail;
      clearConversationTyping(conversationId);

      setConversations(prev => {
        const idx = prev.findIndex(c => c.id === conversationId);
        if (idx >= 0) {
          const updated = [...prev];
          
          // Protection contre une race condition si Pusher (messages-read-sidebar) est déjà passé
          const isOlderOrSame = new Date(timestamp).getTime() <= new Date(updated[idx].timestamp).getTime();
          const currentIsRead = updated[idx].lastMessageIsRead;
          
          updated[idx] = {
            ...updated[idx],
            lastMessage,
            timestamp,
            lastMessageSeen: true, // Since we sent it, we don't bold it
            lastMessageSenderId: user?.id,
            lastMessageIsRead: (isOlderOrSame && currentIsRead) ? true : false
          };
          return updated.sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
        }
        return prev;
      });
    };

    window.addEventListener('chat-message-sent', handleMessageSent);
    return () => window.removeEventListener('chat-message-sent', handleMessageSent);
  }, []);

  // Recherche d'utilisateurs
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        const { data } = await api.get<User[]>(`/api/chat/users/?search=${encodeURIComponent(searchQuery)}`);
        setSearchResults(data);
      } catch (err) {
        console.error('Search error:', err);
        setSearchResults([]);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleStartConversation = async (userId: number) => {
    try {
      const { data } = await api.post<Conversation>(
        '/api/chat/conversations/create/',
        { user_id: userId }
      );

      setConversations(prev => {
        const exists = prev.some(conv =>
          conv.id === data.id ||
          (!conv.isGroup && conv.name === data.name)
        );
        return exists ? prev : [data, ...prev];
      });

      onSelectConversation(data, userId);
      setSearchQuery('');
      setSearchResults([]);
      if (!onSidebarViewChange) {
        setSidebarViewInternal('chats');
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      setError('Échec de la création de la conversation');
      const { data } = await api.get<Conversation[]>('/api/chat/conversations/');
      setConversations(data);
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    setIsLoggingOut(true);
    // Petit délai pour que l'overlay soit visible avant la redirection
    await new Promise(r => setTimeout(r, 1200));
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    router.push('/');
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  const handleProfileClick = () => {
    router.push('/profile');
  };

  // Fonction pour formater la date du dernier message
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();

    // Si c'est aujourd'hui, afficher l'heure
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    // Si c'est hier
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    }

    // Si c'est cette semaine
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(now.getDate() - 7);
    if (date > oneWeekAgo) {
      return date.toLocaleDateString('fr-FR', { weekday: 'long' });
    }

    // Sinon, afficher la date
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };

  return (
    <div className="w-full bg-white h-[100dvh] flex flex-col shadow-xl border-r border-blue/20">
      {/* Overlay déconnexion */}
      <LoadingOverlay visible={isLoggingOut} message="Déconnexion en cours…" />
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 md:p-4 bg-blue">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="p-1.5 md:p-2 bg-white/10 rounded-lg">
            <ChatBubbleLeftRightIcon className="h-5 w-5 md:h-6 md:w-6 text-white" />
          </div>
          <h1 className="text-base md:text-xl font-bold text-white font-[Inter] leading-tight">
            {sidebarView === 'calls' ? 'Appels' : 'Messagerie'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {isStaff && (
            <button
              onClick={() => router.push('/admin')}
              className="p-1.5 rounded-full hover:bg-blue-ciel/10 transition-colors"
              title="Administration"
              aria-label="Administration"
            >
              <ShieldCheckIcon className="h-6 w-6 text-white" />
            </button>
          )}
          <button
            onClick={() => setSidebarView(sidebarView === 'chats' ? 'calls' : 'chats')}
            className={`p-1.5 rounded-full transition-colors ${
              sidebarView === 'calls' ? 'bg-white/20' : 'hover:bg-white/10'
            }`}
            title={sidebarView === 'chats' ? 'Historique des appels' : 'Retour aux conversations'}
            aria-label="Historique des appels"
          >
            <PhoneIcon className="h-6 w-6 text-white" />
          </button>
          {user && (
            <div
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handleProfileClick}
              title="Voir mon profil"
            >
              <Avatar
                src={user.profile?.image}
                alt={user.username}
                className="h-9 w-9 md:h-10 md:w-10 border-2 border-white/30"
                dark={true}
              />
            </div>
          )}
          <button
            onClick={handleLogoutClick}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Se déconnecter"
          >
            <ArrowLeftOnRectangleIcon className="h-6 w-6 text-white" />
          </button>
        </div>
      </div>

      {/* Search bar and Create Group button */}
      {sidebarView === 'chats' && (
      <div className="p-1.5 border-b border-blue/20 flex gap-2 items-center">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-4 w-5 color-blue" />
          </div>
          <input
            type="text"
            placeholder="Rechercher des personnes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-1.5 bg-gray-50 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-jaune focus:bg-white transition-all color-blue placeholder-blue/60"
          />
        </div>
        {/* Bouton Découvrir */}
        {onDiscover && (
          <button
            onClick={onDiscover}
            title="Découvrir des personnes"
            className="p-2.5 bg-[var(--jaune)] text-white rounded-xl hover:bg-[var(--jaune)]/80 transition-colors flex-shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
          </button>
        )}
        <button
          onClick={() => setShowCreateGroupModal(true)}
          title="Novo grupo"
          className="p-2.5 bg-blue text-white rounded-xl hover:bg-blue-ciel transition-colors flex-shrink-0"
        >
          <UserGroupIcon className="h-5 w-5" />
        </button>
      </div>
      )}

      {/* Online users horizontal list */}
      {sidebarView === 'chats' && (
      <div className="px-4 py-1 border-b border-blue/20">
         <div className="flex items-center justify-between gap-2 mb-2.5">
          <h3 className="text-xs font-semibold color-blue">En ligne</h3>
          <button
            type="button"
            onClick={onViewOnlineUsers}
            className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold color-jaune border border-[var(--jaune)]/40 bg-[var(--jaune)]/10 hover:bg-[var(--jaune)]/20 transition-colors"
          >
            Voir tout
          </button>
        </div> 
        <div className="flex gap-3 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-blue/10 scrollbar-track-transparent hover:scrollbar-thumb-blue/20 max-h-[80px] transition-all">
          {Array.from(onlineUsers).map(([userId]) => {
            const onlineUser = allUsers.find(u => u.id === userId) ||
                             searchResults.find(u => u.id === userId) || 
                             conversations.find(c => c.userId === userId)?.user as User;
            
            if (!onlineUser || userId === user?.id) return null;

            return (
              <div 
                key={userId}
                onClick={() => handleStartConversation(Number(userId))}
                className="flex w-11 shrink-0 flex-col items-center cursor-pointer group overflow-hidden"
              >
                <div className="relative shrink-0">
                  <Avatar
                    src={onlineUser.profile?.image}
                    alt={onlineUser.username || ''}
                    className="h-10 w-10 border-2 border-blue hover:border-jaune transition-colors"
                    isOnline={true}
                  />
                </div>
                <span
                  className="mt-1 w-full max-w-full truncate text-center text-[10px] md:text-[11px] color-blue group-hover:color-jaune transition-colors"
                  title={getDisplayName(onlineUser)}
                >
                  {getDisplayName(onlineUser)}
                </span>
              </div>
            );
          })}
          <button
            type="button"
            onClick={onViewOnlineUsers}
            className="flex w-11 shrink-0 flex-col items-center cursor-pointer group"
            aria-label="Voir tous les utilisateurs en ligne"
          >
            <div className="h-10 w-10 rounded-full border-2 border-dashed border-[var(--jaune)]/50 bg-[var(--jaune)]/10 flex items-center justify-center shrink-0 group-hover:bg-[var(--jaune)]/20">
              <ChevronRightIcon className="h-5 w-5 color-jaune" />
            </div>
            <span className="mt-1 w-full truncate text-center text-[10px] md:text-[11px] font-medium color-jaune">
              Voir tout
            </span>
          </button>
        </div>
      </div>
      )}

      {/* Search results */}
      {sidebarView === 'chats' && searchResults.length > 0 && (
        <div className="flex-1 overflow-y-auto px-2">
          <div className="space-y-1 p-2">
            <h3 className="text-xs font-semibold color-blue px-2 py-1">Résultats de recherche</h3>
            {searchResults.map(user => (
              <div
                key={user.id}
                onClick={() => handleStartConversation(Number(user.id))}
                className="flex items-center gap-3 p-3 hover:bg-gray-100 cursor-pointer rounded-lg transition-colors group"
              >
                <Avatar
                  src={user.profile?.image}
                  alt={user.name}
                  className="h-9 w-9 bg-blue/10"
                  isOnline={onlineUsers.get(user.id) || false}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs md:text-sm font-medium color-blue truncate">{getDisplayName(user)}</p>
                  <p className="text-xs color-blue/80 truncate">@{user.username}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Call history */}
      {sidebarView === 'calls' && (
        <div className="flex-1 overflow-y-auto p-2">
          {callsLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-10">
              <ClockIcon className="h-8 w-8 color-blue animate-spin" />
              <p className="color-blue/80 text-sm">Chargement des appels…</p>
            </div>
          ) : callsError ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-10 px-4 text-center">
              <PhoneIcon className="h-10 w-10 text-red-400 opacity-60" />
              <p className="text-red-500 text-sm">{callsError}</p>
              <button
                type="button"
                onClick={() => void fetchCallHistory()}
                className="text-xs text-[var(--blue)] underline"
              >
                Réessayer
              </button>
            </div>
          ) : callHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-10 px-4 text-center">
              <PhoneIcon className="h-10 w-10 color-blue opacity-40" />
              <p className="color-blue/80 text-sm">Aucun appel pour le moment</p>
            </div>
          ) : (
            <div className="space-y-1">
              {callHistory.map((call) => (
                <div
                  key={call.id}
                  onClick={() => handleStartConversation(call.peer.id)}
                  className="flex items-center gap-3 p-3 cursor-pointer rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <Avatar
                    src={call.peer.image || undefined}
                    alt={call.peer.display_name}
                    className="h-10 w-10 bg-blue/20"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm font-semibold color-blue truncate">
                      {call.peer.display_name}
                    </p>
                    <p className={`text-xs truncate ${
                      call.status === 'missed' && call.direction === 'incoming'
                        ? 'text-red-500 font-medium'
                        : 'text-gray-500'
                    }`}>
                      {call.direction === 'outgoing' ? '↗ ' : '↙ '}
                      {call.preview}
                    </p>
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0">
                    {formatTimestamp(call.started_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Conversations list */}
      {sidebarView === 'chats' && !searchResults.length && (
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="animate-spin">
                <ClockIcon className="h-8 w-8 color-blue" />
              </div>
              <p className="color-blue/80 text-sm font-medium">Chargement des conversations...</p>
            </div>
          ) : error ? (
            <div className="p-4 text-center">
              <div className="inline-flex flex-col items-center p-4 rounded-xl bg-jaune/10">
                <span className="text-jaune text-sm font-medium mb-2">⚠️ {error}</span>
                <button
                  onClick={() => window.location.reload()}
                  className="color-blue hover:color-blue-ciel text-sm font-medium"
                >
                  Réessayer
                </button>
              </div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6">
              <div className="w-full max-w-sm text-center rounded-2xl border border-[var(--blue)]/15 bg-gradient-to-b from-[var(--blue)]/5 to-white p-6 shadow-sm">
                <div className="mx-auto mb-4 p-4 bg-[var(--blue)]/10 rounded-full w-fit">
                  <ChatBubbleLeftRightIcon className="h-10 w-10 text-[var(--blue)]" />
                </div>
                <h3 className="text-lg font-bold text-[var(--blue)] mb-2">
                  Aucune conversation
                </h3>
                <p className="text-[var(--blue)] text-sm font-medium leading-relaxed mb-6">
                  Commencez une nouvelle conversation en recherchant un utilisateur ci-dessus, ou découvrez des personnes à contacter.
                </p>
                {onDiscover && (
                  <button
                    type="button"
                    onClick={onDiscover}
                    className="w-full flex items-center justify-center gap-2 bg-[var(--jaune)] hover:bg-[var(--jaune)]/90 text-white font-semibold py-3 px-4 rounded-xl transition-colors shadow-md"
                  >
                    <UserGroupIcon className="h-5 w-5" />
                    Découvrir des personnes
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-0 p-2">
              {conversations.map((conversation) => {
                let peerUserId = conversation.userId ?? conversation.user?.id;
                if (
                  !conversation.isGroup &&
                  !peerUserId &&
                  conversation.lastMessageSenderId &&
                  conversation.lastMessageSenderId !== user?.id
                ) {
                  peerUserId = conversation.lastMessageSenderId;
                }

                const typingUsers = typingInConversations.get(conversation.id) || [];
                const showTyping =
                  typingUsers.length > 0 && activeConversationId !== conversation.id;

                return (
                <div
                  key={conversation.id}
                  onClick={() => onSelectConversation(conversation, Number(peerUserId ?? 0))}
                  className={`group flex items-center gap-2.5 md:gap-3 px-2.5 py-2 md:p-3 cursor-pointer rounded-xl transition-all
                    ${activeConversationId === conversation.id
                      ? 'bg-blue-ciel/20 border border-blue shadow-sm'
                      : 'hover:bg-gray-100 border border-transparent'}`}
                >
                  {conversation.isGroup ? (
                    <GroupAvatar
                      participants={conversation.participants}
                      name={conversation.name}
                    />
                  ) : (
                    <Avatar
                      src={conversation.user?.profile?.image}
                      alt={conversation.name || 'Utilisateur'}
                      className="h-10 w-10 bg-blue/20"
                      isOnline={onlineUsers.get(conversation.userId ?? 0) === true}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-xs md:text-sm font-semibold color-blue truncate">
                        {conversation.name}
                      </h3>
                      <span className="text-xs color-blue font-medium">
                        {formatTimestamp(conversation.timestamp)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      {showTyping ? (
                        <p className="text-sm truncate pr-2 text-[var(--blue)] font-medium italic flex items-center">
                          <span>{getSidebarTypingText(typingUsers, conversation.isGroup)}</span>
                          <TypingDots />
                        </p>
                      ) : (
                        <p className={`text-sm truncate pr-2 ${!conversation.lastMessageSeen ? 'font-bold text-black' : 'text-gray-600'}`}>
                          {conversation.lastMessage || 'Nouvelle conversation'}
                        </p>
                      )}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {conversation.unreadCount > 0 && (
                          <span className="px-2 py-0.5 bg-jaune text-white text-xs font-medium rounded-full">
                            {conversation.unreadCount}
                          </span>
                        )}
                        {conversation.isGroup && (
                          <span className="px-2 py-0.5 bg-blue-ciel/20 color-blue text-xs font-medium rounded-full">
                            Groupe
                          </span>
                        )}
                        {!conversation.isGroup && conversation.lastMessageSenderId === user?.id && (
                          conversation.lastMessageIsRead ? (
                            <Avatar
                              src={conversation.user?.profile?.image}
                              alt={conversation.name || ''}
                              className="h-4 w-4 rounded-full border border-gray-200 opacity-80"
                            />
                          ) : (
                            <div className="h-4 w-4 rounded-full border border-gray-400 flex items-center justify-center opacity-70">
                              <svg className="h-2.5 w-2.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal de confirmation de déconnexion */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold color-blue">Confirmation</h3>
              <button
                onClick={cancelLogout}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <p className="text-gray-700 mb-6">
              Êtes-vous sûr de vouloir vous déconnecter ?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelLogout}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
              >
                Annuler
              </button>
              <button
                onClick={confirmLogout}
                className="px-4 py-2 bg-blue text-white rounded-lg hover:bg-blue-ciel font-medium"
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale de création de groupe */}
      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        allUsers={allUsers}
        currentUserId={user?.id}
      />
    </div>
  );
}
