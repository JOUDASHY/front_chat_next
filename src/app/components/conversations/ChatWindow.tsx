'use client';

import { useState, useEffect, useRef } from 'react';
import api from '@/lib/axiosClient';
import axios from 'axios';
import {
  UserCircleIcon,
  PaperAirplaneIcon,
  EllipsisVerticalIcon,
  PaperClipIcon,
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  PhoneIcon,
  VideoCameraIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import MediaLightbox, { LightboxMedia } from '@/components/MediaLightbox';
import CallEventBubble from '@/components/CallEventBubble';
import { getDisplayName } from '@/lib/userUtils';
import { CallEvent } from '@/lib/callUtils';
import { useCall } from '@/context/CallContext';

interface Message {
  id: number;
  content: string;
  sender: string;
  sender_profile?: {
    image: string | null;
  };
  timestamp: string;
  attachment?: string;
  is_read?: boolean;
  read_at?: string;
  call_event?: CallEvent | null;
  recipient?: {
    id: number;
    username: string;
    profile?: {
      image: string | null;
      lieu: string | null;
      date_naiv: string | null;
      status: string | null;
      passion: string | null;
    }
  };
}

interface PendingMessage extends Omit<Message, 'id'> {
  id: string; // Temporary ID for pending messages
  isPending: boolean;
  isError?: boolean;
  file?: File;
}

interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_online: boolean;
}

interface Conversation {
  id: number;
  name: string;
  lastMessage: string;
  timestamp: string;
  isGroup: boolean;
  userId?: number;
}

interface ChatWindowProps {
  conversation: Conversation | null;
  userId: string | number;
  onBackClick?: () => void; // Fonction pour gérer le retour à la sidebar
  isMobile?: boolean; // Pour savoir si on est sur mobile
}

export default function ChatWindow({ conversation, userId, onBackClick, isMobile }: ChatWindowProps) {
  const router = useRouter();
  const { startCall, phase: callPhase } = useCall();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [recipientOnline, setRecipientOnline] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [recipientId, setRecipientId] = useState<number | null>(null);
  const [recipient, setRecipient] = useState<any>(null);
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [lightbox, setLightbox] = useState<LightboxMedia | null>(null);
  const [openMenuMessageId, setOpenMenuMessageId] = useState<number | null>(null);
  const [editingMessage, setEditingMessage] = useState<{ id: number; content: string } | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<number | null>(null);
  const [savingMessageId, setSavingMessageId] = useState<number | null>(null);
  // Typing indicator
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  
  // Référence pour stocker l'instance Pusher
  const pusherRef = useRef<any>(null);
  
  const handleProfileClick = () => {
    if (conversation && !conversation.isGroup && recipientId) {
      router.push(`/profile/${recipientId}`);
    }
  };

  // Ajoutez ces fonctions utilitaires au début du composant
  const [imageLoadError, setImageLoadError] = useState<{[key: string]: boolean}>({});

  const handleImageError = (imageUrl: string) => {
    setImageLoadError(prev => ({...prev, [imageUrl]: true}));
  };

  const ImageWithFallback = ({ src, alt, className, onClick }: { src?: string, alt: string, className: string, onClick?: () => void }) => {
    if (!src || imageLoadError[src]) {
      return (
        <div className={`${className} bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center`} onClick={onClick}>
          <UserCircleIcon className="w-2/3 h-2/3 text-indigo-600" />
        </div>
      );
    }

    return (
      <img
        src={src}
        alt={alt}
        className={className}
        onError={() => handleImageError(src)}
        onClick={onClick}
        loading="lazy"
        decoding="async"
        style={{ objectFit: 'cover' }}
      />
    );
  };

  // Chargement des données utilisateur
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

  }, []);
  const currentUser= user?.id;

  // Déterminer l'ID du destinataire pour les conversations privées
  useEffect(() => {
    if (conversation && !conversation.isGroup && conversation.userId) {
      setRecipientId(Number(conversation.userId));
    } else if (messages.length > 0 && messages[0]?.recipient?.id) {
      setRecipientId(messages[0].recipient.id);
    }
  }, [conversation, messages]);

  // Chargement initial des messages
  useEffect(() => {
    if (!conversation?.id || userId == null) return;

    // Reset immédiat pour éviter d'afficher les anciens messages d'une autre conversation
    setMessages([]);
    setPendingMessages([]);
    setTypingUsers([]);

    const loadMessages = async () => {
      try {
        const endpoint = conversation.isGroup
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/chat/group/${conversation.id}/`
          : `${process.env.NEXT_PUBLIC_API_URL}/api/chat/private/${userId}/`;
        
        console.log('🛠️ Loading messages from', endpoint);
        console.log('Authorization token:', localStorage.getItem('accessToken'));
        
        const { data } = await api.get(endpoint);
        console.log('API Response:', data);
        
        if (data && data.messages) {
          setMessages(data.messages);
          
          if (data.recipient) {
            setRecipient(data.recipient);
          }
        } else if (Array.isArray(data)) {
          console.log('Setting messages from array:', data);
          setMessages(data);
        } else {
          console.error('Unexpected data format:', data);
          setMessages([]);
        }
      } catch (err) {
        console.error('Error loading messages:', err);
        if (axios.isAxiosError(err)) {
          console.error('Response status:', err.response?.status);
          console.error('Response data:', err.response?.data);
        }
      }
    };
    
    loadMessages();

    // Marquer les messages comme lus (pour les conversations privées)
    if (!conversation.isGroup && userId) {
      api.post(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/private/${userId}/read/`)
        .then(() => console.log('✅ Messages marked as read'))
        .catch((err: unknown) => console.error('Error marking messages as read:', err));
    }
  }, [conversation?.id, userId]);

  // Initialisation de Pusher et abonnement aux canaux
  useEffect(() => {
    if (userId == null || !conversation?.id) return;
    
    let isMounted = true;
    let subscribedChannelName = '';  // Stocké ici pour être accessible au cleanup
    
    const initPusher = async () => {
      const PusherModule = await import('pusher-js');
      const Pusher = PusherModule.default;
      
      if (!isMounted) return;

      // Initialiser Pusher une seule fois
      if (!pusherRef.current) {
        console.log('Initializing Pusher client');
        // @ts-ignore
        Pusher.logToConsole = true;
        pusherRef.current = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
          cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
          forceTLS: true,
          authEndpoint: `${process.env.NEXT_PUBLIC_API_URL}/api/chat/pusher/auth/`,
          auth: {
            headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
          },
        });
      }
      
      // Déterminer le nom du canal pour les messages
      if (conversation.isGroup) {
        subscribedChannelName = `group-chat-${conversation.id}`;
      } else {
        // Pour les conversations privées
        const otherUserId = conversation.userId || recipientId || conversation.id;
        const a = Math.min(Number(currentUser ?? 0), Number(otherUserId));
        const b = Math.max(Number(currentUser ?? 0), Number(otherUserId));
        subscribedChannelName = `private-chat-${a}-${b}`;
      }
      
      console.log(`✅ Subscribing to channel: ${subscribedChannelName}`);
      
      // S'abonner au canal de messages
      const channel = pusherRef.current.subscribe(subscribedChannelName);
      
      // Écouter les nouveaux messages avec filtrage et déduplication
      const handleNewMessage = (data: Message) => {
        console.log('New message received on channel:', subscribedChannelName, data);
        if (!isMounted) return;  // Ignorer si le composant est démonté
        
        // Si c'est un message reçu, on indique au backend qu'on l'a lu instantanément !
        if (data.sender !== user?.username && !conversation.isGroup && userId) {
          api.post(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/private/${userId}/read/`)
            .catch(console.error);
        }
        
        setMessages(prev => {
          // Éviter les doublons (le message peut déjà être dans la liste via la réponse POST)
          const isDuplicate = prev.some(msg => msg.id === data.id);
          if (isDuplicate) {
            console.log('⚠️ Duplicate message ignored:', data.id);
            return prev;
          }
          return [...prev, data];
        });

        // Si c'est notre propre message qui nous revient via Pusher, 
        // on le retire des "pendingMessages" pour éviter la duplication visuelle (fantôme)
        if (data.sender === user?.username) {
           setPendingMessages(prev => {
             // On cherche le pending message qui a le même contenu
             const idx = prev.findIndex(p => p.content.trim() === data.content.trim());
             if (idx !== -1) {
                const newPending = [...prev];
                newPending.splice(idx, 1);
                return newPending;
             }
             return prev;
           });
        }
      };
      
      channel.bind('new-message', handleNewMessage);

      channel.bind('message-deleted', (data: { id: number }) => {
        if (!isMounted) return;
        setMessages(prev => prev.filter(msg => msg.id !== data.id));
      });

      channel.bind('message-updated', (data: Message) => {
        if (!isMounted) return;
        setMessages(prev =>
          prev.map(msg => (msg.id === data.id ? { ...msg, ...data } : msg))
        );
      });
      
      // Écouter les events de frappe
      channel.bind('typing', (data: { userId: number; username: string; isTyping: boolean }) => {
        if (!isMounted) return;
        if (data.userId === user?.id) return; // ignorer ses propres events
        setTypingUsers(prev => {
          if (data.isTyping) {
            return prev.includes(data.username) ? prev : [...prev, data.username];
          } else {
            return prev.filter(u => u !== data.username);
          }
        });
      });
      
      // S'abonner au canal de présence pour le statut en ligne
      const presenceChannel = pusherRef.current.subscribe('presence-channel');
      
      presenceChannel.bind('pusher:subscription_succeeded', (data: any) => {
        if (recipientId && data && data.members) {
          const isOnline = Object.keys(data.members).includes(String(recipientId));
          setRecipientOnline(isOnline);
        }
      });
      
      presenceChannel.bind('pusher:member_added', (member: any) => {
        if (recipientId && member.id == recipientId) {
          setRecipientOnline(true);
        }
      });
      
      presenceChannel.bind('pusher:member_removed', (member: any) => {
        if (recipientId && member.id == recipientId) {
          setRecipientOnline(false);
        }
      });
      
      // Écouter l'événement "messages lus" pour mettre à jour les check marks
      channel.bind('messages-read', (data: { reader_id: number; read_at: string }) => {
        console.log('🟢 Messages marked as read by:', data.reader_id);
        if (!isMounted) return;
        setMessages(prev =>
          prev.map(msg =>
            msg.sender === user?.username && !msg.is_read
              ? { ...msg, is_read: true, read_at: data.read_at }
              : msg
          )
        );
      });
    };
    
    initPusher();

    // Cleanup : désabonner et débinder les canaux lors du changement de conversation
    return () => {
      isMounted = false;
      if (pusherRef.current) {
        if (subscribedChannelName) {
          console.log(`🔴 Unsubscribing from channel: ${subscribedChannelName}`);
          const channel = pusherRef.current.channel(subscribedChannelName);
          if (channel) {
            channel.unbind_all();  // Retirer tous les handlers de ce canal
          }
          pusherRef.current.unsubscribe(subscribedChannelName);  // Désabonner du canal
        }
        // Aussi nettoyer le canal de présence pour éviter les handlers dupliqués
        const presenceChannel = pusherRef.current.channel('presence-channel');
        if (presenceChannel) {
          presenceChannel.unbind_all();
        }
        pusherRef.current.unsubscribe('presence-channel');
      }
    };
  }, [userId, conversation?.id, recipientId, conversation?.userId, user]);

  useEffect(() => {
    if (openMenuMessageId === null) return;
    const closeMenu = () => setOpenMenuMessageId(null);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, [openMenuMessageId]);
  
  // Nettoyage de Pusher lors du démontage complet
  useEffect(() => {
    return () => {
      if (pusherRef.current) {
        console.log('Disconnecting Pusher client');
        pusherRef.current.disconnect();
        pusherRef.current = null;
      }
    };
  }, []);

  // Défilement automatique
  const prevMessagesLengthRef = useRef(0);

  useEffect(() => {
    // Déterminer s'il s'agit d'un chargement initial (grand saut de messages)
    const isNewLoad = Math.abs(messages.length - prevMessagesLengthRef.current) > 1;
    prevMessagesLengthRef.current = messages.length;

    // Petit délai pour laisser le temps au DOM (HTML) de s'agrandir avec le nouveau message
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ 
        behavior: isNewLoad ? 'auto' : 'smooth' 
      });
    }, 50);

    return () => clearTimeout(timer);
  }, [messages, pendingMessages]);

  // ── Typing indicator ──────────────────────────────────────────────
  const getTypingChannel = () => {
    if (!conversation) return null;
    if (conversation.isGroup) return `group-chat-${conversation.id}`;
    const a = Math.min(Number(user?.id ?? 0), Number(userId));
    const b = Math.max(Number(user?.id ?? 0), Number(userId));
    return `private-chat-${a}-${b}`;
  };

  const sendTypingEvent = (typing: boolean) => {
    const channel = getTypingChannel();
    if (!channel) return;
    api.post('/api/chat/typing/', { isTyping: typing, channel }).catch(() => {});
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      sendTypingEvent(true);
    }
    // Auto-stop après 2.5s sans frappe
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      sendTypingEvent(false);
    }, 2500);
  };

  // Stop typing quand message envoyé
  const stopTyping = () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      sendTypingEvent(false);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => { if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current); };
  }, []);

  // Envoi de message
  const sendMessage = async () => {
    if ((!newMessage.trim() && !file) || !conversation?.id || userId == null || isSending) return;
    
    setIsSending(true);
    stopTyping();
    
    // Créer un message temporaire
    const tempMessage: PendingMessage = {
      id: `pending-${Date.now()}`,
      content: newMessage.trim(),
      sender: user?.username || '',
      timestamp: new Date().toISOString(),
      isPending: true,
      file: file || undefined
    };

    // Ajouter le message à l'état pending et réinitialiser l'input
    setPendingMessages(prev => [...prev, tempMessage]);
    setNewMessage('');
    setFile(null);
    
    // Notifier la sidebar IMMÉDIATEMENT (optimistic UI) pour éviter une race condition avec Pusher
    window.dispatchEvent(new CustomEvent('chat-message-sent', {
      detail: {
        conversationId: conversation.id,
        lastMessage: tempMessage.content,
        timestamp: tempMessage.timestamp,
      }
    }));

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL!;
      const endpoint = conversation.isGroup
        ? `${API_URL}/api/chat/group/${conversation.id}/`
        : `${API_URL}/api/chat/private/${userId}/`;

      const formData = new FormData();
      formData.append('content', tempMessage.content);  // peut être vide, le backend l'accepte si attachment présent
      
      if (!conversation.isGroup && recipientId) {
        formData.append('recipient', String(recipientId));
      }
      
      if (tempMessage.file) {
        formData.append('attachment', tempMessage.file);
      }

      const { data } = await api.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Ajouter le vrai message si Pusher est en retard
      setMessages(prev => {
        const isDuplicate = prev.some(msg => msg.id === data.id);
        if (isDuplicate) return prev;
        return [...prev, data];
      });

      // Retirer le message des pending après succès
      setPendingMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      
    } catch (err) {
      // Marquer le message comme erreur
      setPendingMessages(prev => 
        prev.map(msg => 
          msg.id === tempMessage.id 
            ? { ...msg, isPending: false, isError: true }
            : msg
        )
      );
      console.error('❌ Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    if (deletingMessageId !== null) return;
    if (!window.confirm('Supprimer ce message ?')) return;

    setOpenMenuMessageId(null);
    setDeletingMessageId(messageId);
    try {
      await api.delete(`/api/chat/messages/${messageId}/`);
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      if (editingMessage?.id === messageId) setEditingMessage(null);
    } catch (err) {
      console.error('Error deleting message:', err);
    } finally {
      setDeletingMessageId(null);
    }
  };

  const startEditMessage = (msg: Message) => {
    setOpenMenuMessageId(null);
    setEditingMessage({ id: msg.id, content: msg.content });
  };

  const cancelEditMessage = () => {
    setEditingMessage(null);
  };

  const handleSaveEditMessage = async () => {
    if (!editingMessage || savingMessageId !== null) return;
    const trimmed = editingMessage.content.trim();
    if (!trimmed) return;

    setSavingMessageId(editingMessage.id);
    try {
      const { data } = await api.patch(`/api/chat/messages/${editingMessage.id}/`, {
        content: trimmed,
      });
      setMessages(prev =>
        prev.map(msg => (msg.id === data.id ? { ...msg, ...data } : msg))
      );
      setEditingMessage(null);
    } catch (err) {
      console.error('Error updating message:', err);
    } finally {
      setSavingMessageId(null);
    }
  };

  // Vérifier le statut en ligne du destinataire
  useEffect(() => {
    if (!recipientId) return;
    
    const checkOnlineStatus = async () => {
      try {
        const { data } = await api.get(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/users/${recipientId}/`);
        setRecipientOnline(data.is_online || false);
      } catch (err) {
        console.error('Error checking online status:', err);
      }
    };
    
    checkOnlineStatus();
  }, [recipientId]);

  if (!conversation) {
    return (
      <div className="w-full h-full bg-gray-50 flex flex-col">

        <div className="p-4 bg-indigo-600 text-white flex justify-between items-center">
          <h1 className="text-2xl font-bold">WhatsApp</h1>
          <EllipsisVerticalIcon className="h-6 w-6 cursor-pointer" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 text-lg">Sélectionnez une conversation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-gray-50">
      {/* Header fixe */}
      <div
        className="sticky top-0 z-10 p-4 bg-white border-b flex items-center gap-3 shadow-md cursor-pointer transition-all hover:bg-gray-50"
        onClick={handleProfileClick}
      >
        {/* Bouton de retour - visible uniquement sur mobile */}
        {isMobile && onBackClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBackClick();
            }}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Retour"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
          </button>
        )}
        
        <div className="h-12 w-12 rounded-full overflow-hidden border border-indigo-100 shadow-sm shrink-0 flex items-center justify-center">
          {conversation.isGroup ? (
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[var(--blue)] to-[var(--blue-ciel)] flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          ) : (
            <ImageWithFallback
              src={recipient?.profile?.image}
              alt={conversation.name || getDisplayName(recipient) || ''}
              className="h-full w-full"
            />
          )}
        </div>
        <div className="flex-1">
          <h2 className="font-bold text-xl text-gray-900">
            {conversation.name || getDisplayName(recipient) || 'Utilisateur'}
          </h2>
          {!conversation.isGroup && recipient?.username && (
            <p className="text-xs text-gray-400">@{recipient.username}</p>
          )}
          <p className="text-sm text-gray-500 flex items-center">
            {conversation.isGroup ? (
              <>
                <span className="h-2 w-2 rounded-full bg-indigo-400 mr-2"></span>
                Groupe
              </>
            ) : (
              <>
                <span className={`h-2 w-2 rounded-full ${recipientOnline ? 'bg-green-500' : 'bg-gray-400'} mr-2`}></span>
                {recipientOnline ? 'En ligne' : 'Hors ligne'}
              </>
            )}
          </p>
        </div>
        {!conversation.isGroup && recipientId && callPhase === 'idle' && (
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => void startCall(recipientId, 'audio')}
              className="p-2 rounded-full hover:bg-green-50 text-green-600 transition-colors"
              title="Appel vocal"
              aria-label="Appel vocal"
            >
              <PhoneIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => void startCall(recipientId, 'video')}
              className="p-2 rounded-full hover:bg-indigo-50 text-indigo-600 transition-colors"
              title="Appel vidéo"
              aria-label="Appel vidéo"
            >
              <VideoCameraIcon className="h-5 w-5" />
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <EllipsisVerticalIcon className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {/* Ajuster le conteneur des messages pour tenir compte du header fixe */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4 mt-[1px]">
        {Array.isArray(messages) && messages.length > 0 ? (
          (() => {
            // Trouver l'ID du tout dernier message envoyé par l'utilisateur (pour l'avatar de lecture)
            const lastUserMessageId = [...messages]
              .reverse()
              .find(m => m.sender === user?.username && !m.call_event)?.id;
            
            return messages.map(msg => {
              if (msg.call_event) {
                return (
                  <CallEventBubble
                    key={msg.id}
                    callEvent={msg.call_event}
                    currentUserId={user?.id ?? 0}
                    timestamp={msg.timestamp}
                  />
                );
              }

              const isCurrentUser = msg.sender === user?.username;
              const isLastUserMessage = msg.id === lastUserMessageId;
              
              return (
                <div key={msg.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                {/* Avatar pour les messages reçus */}
                {!isCurrentUser && (
                  <div className="mr-2 mt-1 shrink-0">
                    <div className="h-8 w-8 rounded-full overflow-hidden border border-gray-200 shadow-sm">
                      <ImageWithFallback
                        src={msg.sender_profile?.image ?? recipient?.profile?.image ?? undefined}
                        alt={msg.sender}
                        className="h-full w-full"
                      />
                    </div>
                  </div>
                )}

                <div className={`max-w-xs md:max-w-md lg:max-w-lg ${isCurrentUser ? 'items-end' : 'items-start'} flex flex-col group`}>
                  <div
                    className={`relative p-3 rounded-lg shadow-sm ${
                      isCurrentUser
                        ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-tr-none'
                        : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                    }`}
                  >
                    {/* En-tête du message */}
                    <div className="flex justify-between mb-2 items-center gap-2">
                      <span className={`text-sm font-semibold ${isCurrentUser ? 'text-white/90' : 'text-gray-800'}`}>
                        {isCurrentUser ? 'Vous' : msg.sender}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {isCurrentUser && (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuMessageId(openMenuMessageId === msg.id ? null : msg.id);
                              }}
                              className={`p-1 rounded-full transition-opacity hover:bg-white/20 ${
                                isMobile || openMenuMessageId === msg.id
                                  ? 'opacity-100'
                                  : 'opacity-0 group-hover:opacity-70'
                              }`}
                              aria-label="Options du message"
                            >
                              <EllipsisVerticalIcon className="h-4 w-4" />
                            </button>
                            {openMenuMessageId === msg.id && (
                              <div
                                className="absolute right-0 top-full mt-1 z-30 min-w-[150px] rounded-xl border border-gray-100 bg-white py-1 shadow-lg"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {msg.content && !msg.attachment && (
                                  <button
                                    type="button"
                                    onClick={() => startEditMessage(msg)}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    <PencilIcon className="h-4 w-4" />
                                    Modifier
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  disabled={deletingMessageId === msg.id}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                                >
                                  {deletingMessageId === msg.id ? (
                                    <span className="h-4 w-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                                  ) : (
                                    <TrashIcon className="h-4 w-4" />
                                  )}
                                  Supprimer
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        <span className={`text-xs ${isCurrentUser ? 'text-white/70' : 'text-gray-400'}`}>
                          {new Date(msg.timestamp).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                    
                    {/* Contenu du message */}
                    {editingMessage?.id === msg.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editingMessage.content}
                          onChange={(e) =>
                            setEditingMessage({ ...editingMessage, content: e.target.value })
                          }
                          rows={2}
                          className="w-full rounded-lg border border-white/30 bg-white/10 px-2 py-1.5 text-sm text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/40 resize-none"
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={cancelEditMessage}
                            className="rounded-lg px-2.5 py-1 text-xs text-white/80 hover:bg-white/10"
                          >
                            Annuler
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveEditMessage}
                            disabled={!editingMessage.content.trim() || savingMessageId === msg.id}
                            className="rounded-lg bg-white/20 px-2.5 py-1 text-xs font-medium text-white hover:bg-white/30 disabled:opacity-50"
                          >
                            {savingMessageId === msg.id ? 'Enregistrement…' : 'Enregistrer'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      msg.content && (
                        <p className={`text-sm ${isCurrentUser ? 'text-white' : 'text-gray-800'}`}>
                          {msg.content}
                        </p>
                      )
                    )}
                    
                    {/* Pièce jointe */}
                    {msg.attachment && (
                      <div className={`mt-2 rounded-lg overflow-hidden ${isCurrentUser ? 'bg-indigo-700/30' : 'bg-gray-50'}`}>
                        {(() => {
                          const fileUrl = msg.attachment;
                          const fileExtension = fileUrl.split('.').pop()?.toLowerCase();
                          const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExtension || '');
                          const isVideo = ['mp4', 'webm', 'ogg', 'mov'].includes(fileExtension || '');
                          const isPdf = fileExtension === 'pdf';
                          const isAudio = ['mp3', 'wav', 'ogg', 'aac'].includes(fileExtension || '');
                          
                          // Extraire le nom du fichier de l'URL
                          const fileName = fileUrl.split('/').pop() || 'fichier';
                          const decodedFileName = decodeURIComponent(fileName);

                          if (isImage) {
                            return (
                              <div className={`rounded-lg overflow-hidden ${isCurrentUser ? 'bg-indigo-700/20' : 'bg-gray-100'} p-1`}>
                                <ImageWithFallback
                                  src={fileUrl}
                                  alt={decodedFileName}
                                  className="max-w-full h-auto rounded-lg max-h-60 object-contain cursor-zoom-in hover:opacity-90 transition-opacity"
                                  onClick={() => setLightbox({ url: fileUrl, type: 'image', name: decodedFileName })}
                                />
                                <div className={`text-xs text-center mt-1 ${isCurrentUser ? 'text-white/70' : 'text-gray-500'}`}>
                                  {decodedFileName}
                                </div>
                              </div>
                            );
                          } else if (isVideo) {
                            return (
                              <div className={`rounded-lg overflow-hidden ${isCurrentUser ? 'bg-indigo-700/20' : 'bg-gray-100'} p-2`}>
                                {/* Thumbnail cliquable */}
                                <div
                                  className="relative cursor-pointer group"
                                  onClick={() => setLightbox({ url: fileUrl, type: 'video', name: decodedFileName })}
                                >
                                  <video
                                    src={fileUrl}
                                    className="max-w-full max-h-60 rounded-lg pointer-events-none"
                                    preload="metadata"
                                  />
                                  {/* Play overlay */}
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors rounded-lg">
                                    <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                                      <svg className="w-5 h-5 text-gray-800 ml-1" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z"/>
                                      </svg>
                                    </div>
                                  </div>
                                </div>
                                <div className={`text-xs text-center mt-1 ${isCurrentUser ? 'text-white/70' : 'text-gray-500'}`}>
                                  {decodedFileName}
                                </div>
                              </div>
                            );
                          } else if (isPdf) {
                            return (
                              <div className={`flex flex-col p-3 ${isCurrentUser ? 'bg-indigo-700/20' : 'bg-gray-100'} rounded-lg`}>
                                <div className="flex items-center mb-2">
                                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 ${isCurrentUser ? 'text-red-300' : 'text-red-500'} mr-2`} viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                  </svg>
                                  <span className={`text-sm truncate max-w-[150px] ${isCurrentUser ? 'text-white/90' : 'text-gray-700'}`}>{decodedFileName}</span>
                                </div>
                                <iframe 
                                  src={`${fileUrl}#toolbar=0&navpanes=0`} 
                                  className="w-full h-60 rounded border border-gray-300 bg-white"
                                  title={decodedFileName}
                                />
                                <a 
                                  href={fileUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className={`${isCurrentUser ? 'text-indigo-200' : 'text-indigo-600'} hover:underline text-sm mt-2 text-center`}
                                >
                                  Ouvrir le PDF
                                </a>
                              </div>
                            );
                          } else if (isAudio) {
                            return (
                              <div className={`rounded-lg overflow-hidden ${isCurrentUser ? 'bg-indigo-700/20' : 'bg-gray-100'} p-3`}>
                                <div className="flex items-center mb-2">
                                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isCurrentUser ? 'text-indigo-300' : 'text-indigo-500'} mr-2`} viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071a1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243a1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828a1 1 0 010-1.415z" clipRule="evenodd" />
                                  </svg>
                                  <span className={`text-sm truncate max-w-[150px] ${isCurrentUser ? 'text-white/90' : 'text-gray-700'}`}>{decodedFileName}</span>
                                </div>
                                <audio 
                                  src={fileUrl} 
                                  controls 
                                  className="w-full"
                                />
                              </div>
                            );
                          } else {
                            // Pour les autres types de fichiers
                            return (
                              <div className={`flex items-center p-3 ${isCurrentUser ? 'bg-indigo-700/20' : 'bg-gray-100'} rounded-lg`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 ${isCurrentUser ? 'text-gray-300' : 'text-gray-500'} mr-2`} viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a3 3 0 006 0V7a1 1 0 112 0v4a5 5 0 01-10 0V7a5 5 0 0110 0v1.5a2.5 2.5 0 01-5 0V7a1 1 0 012 0v1.5a.5.5 0 001 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                                </svg>
                                <div className="flex flex-col">
                                  <span className={`text-sm truncate max-w-[150px] ${isCurrentUser ? 'text-white/90' : 'text-gray-700'}`}>{decodedFileName}</span>
                                  <a 
                                    href={fileUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className={`${isCurrentUser ? 'text-indigo-200' : 'text-indigo-600'} hover:underline text-xs`}
                                  >
                                    Télécharger
                                  </a>
                                </div>
                              </div>
                            );
                          }
                        })()}
                      </div>
                    )}
                  </div>
                  {/* Indicateur de statut de lecture */}
                  {isCurrentUser && isLastUserMessage && (
                    <div className="flex items-center mt-1 text-xs justify-end h-4">
                      {msg.is_read ? (
                        /* Mini avatar de l'interlocuteur */
                        <div className="h-4 w-4 rounded-full overflow-hidden border border-gray-200 opacity-80">
                          <ImageWithFallback
                            src={recipient?.profile?.image}
                            alt={recipient?.username || ''}
                            className="h-full w-full"
                          />
                        </div>
                      ) : (
                        /* Check gris (envoyé) */
                        <div className="h-4 w-4 rounded-full border border-gray-400 flex items-center justify-center opacity-70">
                          <svg className="h-2.5 w-2.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        })()
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">
              Aucun message à afficher
              {/* Debug info */}
              {process.env.NODE_ENV === 'development' && (
                <span className="block text-xs mt-2 text-red-500">
                  Messages data: {JSON.stringify(messages).substring(0, 100)}...
                </span>
              )}
            </p>
          </div>
        )}

        {/* Messages en attente */}
        {pendingMessages.map(msg => (
          <div key={msg.id} className="flex justify-end animate-fadeIn">
            <div className="max-w-xs md:max-w-md lg:max-w-lg items-end flex flex-col">
              <div className="p-3 rounded-lg shadow-sm bg-gradient-to-br from-indigo-500/80 to-indigo-600/80 text-white rounded-tr-none">
                <div className="flex justify-between mb-2 items-center">
                  <span className="text-sm font-semibold text-white/90">Vous</span>
                  <span className="ms-2 text-xs text-white/70">
                    {new Date(msg.timestamp).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                
                <p className="text-sm text-white">{msg.content}</p>

                {msg.file && (
                  <div className="mt-2 p-2 bg-indigo-700/30 rounded-lg flex items-center gap-2">
                    <PaperClipIcon className="h-4 w-4 text-white/70 shrink-0" />
                    <p className="text-xs text-white/80 truncate">{msg.file.name}</p>
                  </div>
                )}
              </div>

              {/* Indicateur d'état */}
              <div className="flex items-center mt-1 text-xs text-gray-500 justify-end">
                {msg.isPending ? (
                  <svg className="animate-spin h-3 w-3 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : msg.isError ? (
                  <svg className="h-3 w-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="h-3 w-3 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </div>
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Indicateur de frappe */}
        {typingUsers.length > 0 && (
          <div className="px-4 pb-1 flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1.5 shadow-sm">
              {/* Trois points animés */}
              <div className="flex items-center gap-[3px]">
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
              <span className="text-xs text-gray-500">
                {typingUsers.length === 1
                  ? `${typingUsers[0]} est en train d'écrire...`
                  : typingUsers.length === 2
                  ? `${typingUsers[0]} et ${typingUsers[1]} écrivent...`
                  : `${typingUsers.length} personnes écrivent...`}
              </span>
            </div>
          </div>
        )}

      {/* Input fixe */}
      <div className="sticky bottom-0 left-0 right-0 z-10 bg-white border-t shadow-lg">
        <div className="max-w-[100%] mx-auto p-4 flex items-center gap-3">
          <label className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
            <input
              type="file"
              onChange={e => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            <PaperClipIcon className="h-5 w-5 text-gray-500" />
          </label>
          
          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Écrivez un message..."
            className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800 placeholder-gray-400"
            disabled={isSending}
          />
          
          <button
            onClick={sendMessage}
            disabled={isSending}
            className="p-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-500 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
      {/* Lightbox plein écran image / vidéo */}
      <MediaLightbox media={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}
