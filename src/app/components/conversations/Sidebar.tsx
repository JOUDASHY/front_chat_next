'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/axiosClient';
import Pusher from 'pusher-js';
import {
  UserGroupIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  ArrowLeftOnRectangleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

export interface Conversation {
  id: number;
  name: string;
  lastMessage: string;
  timestamp: string;
  isGroup: boolean;
  userId?: number;
  user: {
    profile?: {
      image?: string;
    }
  };
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
}

const Avatar = ({ src, alt = '', className = '', isOnline = false }: { src?: string; alt?: string; className?: string; isOnline?: boolean }) => {
  return (
    <div className="relative">
      {src ? (
        <img
          src={src}
          alt={alt}
          className={`rounded-full object-cover ${className}`}
        />
      ) : (
        <div className={`rounded-full bg-blue/20 flex items-center justify-center ${className}`}>
          <span className="text-blue font-medium text-sm">
            {alt
              ? alt.split(' ').map((n) => n[0]).join('').toUpperCase()
              : ''}
          </span>
        </div>
      )}
      {isOnline && (
        <span className="absolute bottom-1 right-0 translate-x-1/3 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></span>
      )}
    </div>
  );
};

export default function Sidebar({ onSelectConversation, activeConversationId }: SidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Map<number, boolean>>(new Map());  // Changed from Map<string | number, boolean>
  const router = useRouter();

  // Référence pour stocker l'instance Pusher
  const pusherRef = useRef<Pusher | null>(null);

  // Initialiser Pusher
  useEffect(() => {
    if (!pusherRef.current) {
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
    }

    return () => {
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

  // Charger l'utilisateur depuis localStorage
  useEffect(() => {
    const fetchUserFromLocalStorage = () => {
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      }
    };

    fetchUserFromLocalStorage();
  }, []);

  // S'abonner aux canaux Pusher pour les mises à jour des conversations
  useEffect(() => {
    if (!pusherRef.current || !user) return;

    // S'abonner au canal de l'utilisateur pour les mises à jour de conversations
    const channel = pusherRef.current.subscribe(`user-${user.id}-conversations`);

    // Écouter les nouveaux messages
    channel.bind('new-message', (data: { conversation: Conversation }) => {
      setConversations(prev => {
        // Trouver si la conversation existe déjà
        const existingIndex = prev.findIndex(conv => conv.id === data.conversation.id);

        if (existingIndex >= 0) {
          // Mettre à jour la conversation existante
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            lastMessage: data.conversation.lastMessage,
            timestamp: data.conversation.timestamp
          };

          // Trier les conversations par timestamp (plus récent en premier)
          return updated.sort((a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
        } else {
          // Ajouter la nouvelle conversation au début
          return [data.conversation, ...prev];
        }
      });
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
    };
  }, [user]);

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

  const confirmLogout = () => {
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
    <div className="w-full bg-white h-screen flex flex-col shadow-xl border-r border-blue/20">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-blue">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-lg">
            <ChatBubbleLeftRightIcon className="h-6 w-6 text-jaune" />
          </div>
          <h1 className="text-xl font-bold text-white font-[Inter]">Messagerie</h1>
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <div
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handleProfileClick}
              title="Voir mon profil"
            >
              <Avatar
                src={user.profile?.image}
                alt={user.username}
                className="h-8 w-8 border-2 border-jaune/20"
              />
            </div>
          )}
          <button
            onClick={handleLogoutClick}
            className="p-1.5 hover:bg-blue-ciel/10 rounded-full transition-colors"
            aria-label="Se déconnecter"
          >
            <ArrowLeftOnRectangleIcon className="h-6 w-6 text-jaune" />
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="p-4 border-b border-blue/20">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 color-blue" />
          </div>
          <input
            type="text"
            placeholder="Rechercher des personnes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-jaune focus:bg-white transition-all color-blue placeholder-blue/60"
          />
        </div>
      </div>

      {/* Search results */}
      {searchResults.length > 0 && (
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
                  <p className="text-sm font-medium color-blue truncate">{user.username}</p>
                  <p className="text-xs color-blue/80 truncate">{user.email}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conversations list */}
      {!searchResults.length && (
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
            <div className="flex flex-col items-center justify-center h-full p-4 gap-4">
              <div className="p-4 bg-blue/10 rounded-full">
                <UserGroupIcon className="h-10 w-10 color-blue" />
              </div>
              <p className="color-blue/80 text-center max-w-xs font-medium">
                Commencez une nouvelle conversation en recherchant un utilisateur
              </p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => onSelectConversation(conversation, Number(conversation.userId ?? 0))}
                  className={`group flex items-center gap-3 p-3 cursor-pointer rounded-xl transition-all
                    ${activeConversationId === conversation.id
                      ? 'bg-blue-ciel/20 border border-blue shadow-sm'
                      : 'hover:bg-gray-100 border border-transparent'}`}
                >
                  <Avatar
                    src={conversation.user.profile?.image}
                    alt={conversation.name}
                    className={`h-10 w-10 ${conversation.isGroup ? 'bg-blue-ciel/20' : 'bg-blue/20'}`}
                    isOnline={!conversation.isGroup && onlineUsers.get(conversation.userId ?? 0) === true}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-semibold color-blue truncate">
                        {conversation.name}
                      </h3>
                      <span className="text-xs color-blue font-medium">
                        {formatTimestamp(conversation.timestamp)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-black font-semibold truncate">
                        {conversation.lastMessage || 'Nouvelle conversation'}
                      </p>
                      {conversation.isGroup && (
                        <span className="px-2 py-0.5 bg-blue-ciel/20 color-blue text-xs font-medium rounded-full">
                          Groupe
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
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
    </div>
  );
}
