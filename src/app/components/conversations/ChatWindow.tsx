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
  XMarkIcon,
  DocumentIcon,
  NoSymbolIcon,
  CheckCircleIcon,
  MicrophoneIcon,
  StopIcon,
  MagnifyingGlassIcon,
  FaceSmileIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import MediaLightbox, { LightboxMedia } from '@/components/MediaLightbox';
import CallEventBubble from '@/components/CallEventBubble';
import VoiceMessagePlayer from '@/components/VoiceMessagePlayer';
import { getDisplayName, formatLastSeen } from '@/lib/userUtils';
import { CallEvent } from '@/lib/callUtils';
import { useCall } from '@/context/CallContext';

// Chargement lazy du picker (lourd ~200kb)
const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

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

function PendingFilePreview({ file }: { file: File }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [file]);

  return (
    <div className="mt-1.5 md:mt-2 rounded-md md:rounded-lg overflow-hidden bg-indigo-700/30">
      {previewUrl ? (
        <img src={previewUrl} alt={file.name} className="max-h-40 w-full object-cover" />
      ) : (
        <div className="p-2 flex items-center gap-2">
          <PaperClipIcon className="h-4 w-4 text-white/70 shrink-0" />
          <p className="text-xs text-white/80 truncate">{file.name}</p>
        </div>
      )}
      {previewUrl && (
        <p className="px-2 py-1 text-[10px] text-white/70 truncate">{file.name}</p>
      )}
    </div>
  );
}

function isImageAttachment(url?: string) {
  if (!url) return false;
  const ext = url.split('.').pop()?.split('?')[0]?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '');
}

export default function ChatWindow({ conversation, userId, onBackClick, isMobile }: ChatWindowProps) {
  const router = useRouter();
  const { startCall, phase: callPhase } = useCall();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSending, setIsSending] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [recipientOnline, setRecipientOnline] = useState(false);
  const [recipientLastSeen, setRecipientLastSeen] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [recipientId, setRecipientId] = useState<number | null>(null);
  const [recipient, setRecipient] = useState<any>(null);
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [lightbox, setLightbox] = useState<LightboxMedia | null>(null);
  const [openMenuMessageId, setOpenMenuMessageId] = useState<number | null>(null);
  const [editingMessage, setEditingMessage] = useState<{ id: number; content: string } | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<number | null>(null);
  const [savingMessageId, setSavingMessageId] = useState<number | null>(null);
  // Block state
  const [iBlockedThem, setIBlockedThem] = useState(false);
  const [theyBlockedMe, setTheyBlockedMe] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const headerMenuRef = useRef<HTMLDivElement>(null);

  // Emoji picker
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Recherche dans la conversation
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<number[]>([]); // indices dans messages[]
  const [searchCursor, setSearchCursor] = useState(0); // résultat actif
  const searchInputRef = useRef<HTMLInputElement>(null);
  const messageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Voice message state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Typing indicator
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  
  // Référence pour stocker l'instance Pusher
  const pusherRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
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
    setMessagesLoading(true);

    const loadMessages = async () => {
      try {
        const endpoint = conversation.isGroup
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/chat/group/${conversation.id}/`
          : `${process.env.NEXT_PUBLIC_API_URL}/api/chat/private/${userId}/`;
        
        const { data } = await api.get(endpoint);
        
        if (data && data.messages) {
          setMessages(data.messages);
          
          if (data.recipient) {
            setRecipient(data.recipient);
            setRecipientLastSeen(data.recipient?.profile?.last_online ?? null);
          }
        } else if (Array.isArray(data)) {
          setMessages(data);
        } else {
          setMessages([]);
        }
      } catch (err) {
        console.error('Error loading messages:', err);
      } finally {
        setMessagesLoading(false);
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
          // Refetch last_online depuis l'API pour avoir la valeur à jour
          api.get(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/users/${recipientId}/`)
            .then(({ data }) => {
              if (data.profile?.last_online) setRecipientLastSeen(data.profile.last_online);
            })
            .catch(() => {});
        }
      });
      
      // Écouter les mises à jour de last_online (quand le destinataire se déconnecte)
      presenceChannel.bind('user-status-changed', (data: { userId: number; isOnline: boolean; lastOnline?: string }) => {
        if (!isMounted) return;
        if (recipientId && data.userId === recipientId) {
          setRecipientOnline(data.isOnline);
          if (!data.isOnline && data.lastOnline) {
            setRecipientLastSeen(data.lastOnline);
          }
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

  // Auto-focus desktop uniquement — sur mobile le clavier ne doit pas s'ouvrir à la sélection
  useEffect(() => {
    if (!conversation?.id || isMobile) return;
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, [conversation?.id, isMobile]);

  const scrollMessagesToBottom = (behavior: ScrollBehavior = 'auto') => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior });
      return;
    }
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
  };

  // Garder le dernier message visible au-dessus du clavier (mobile)
  useEffect(() => {
    if (!isMobile || !conversation?.id) return;

    const vv = window.visualViewport;
    if (!vv) return;

    const handleViewportChange = () => {
      requestAnimationFrame(() => scrollMessagesToBottom('auto'));
    };

    vv.addEventListener('resize', handleViewportChange);
    vv.addEventListener('scroll', handleViewportChange);
    return () => {
      vv.removeEventListener('resize', handleViewportChange);
      vv.removeEventListener('scroll', handleViewportChange);
    };
  }, [isMobile, conversation?.id]);

  const handleInputFocus = () => {
    if (!isMobile) return;
    // Délais pour laisser le clavier terminer son animation
    const delays = [50, 150, 350];
    delays.forEach((ms) => {
      setTimeout(() => scrollMessagesToBottom('auto'), ms);
    });
  };
  useEffect(() => {
    if (!file) {
      setFilePreviewUrl(null);
      return;
    }
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setFilePreviewUrl(null);
  }, [file]);

  const clearSelectedFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (selected: File | null) => {
    setFile(selected);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  // Défilement automatique
  const prevMessagesLengthRef = useRef(0);

  useEffect(() => {
    // Déterminer s'il s'agit d'un chargement initial (grand saut de messages)
    const isNewLoad = Math.abs(messages.length - prevMessagesLengthRef.current) > 1;
    prevMessagesLengthRef.current = messages.length;

    // Petit délai pour laisser le temps au DOM (HTML) de s'agrandir avec le nouveau message
    const timer = setTimeout(() => {
      scrollMessagesToBottom(isNewLoad ? 'auto' : 'smooth');
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
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (mediaRecorderRef.current?.state !== 'inactive') {
        mediaRecorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
      }
      if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    };
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
    clearSelectedFile();
    // Re-focus immédiat pour que l'user puisse enchaîner sans re-cliquer
    inputRef.current?.focus();
    
    // Notifier la sidebar IMMÉDIATEMENT (optimistic UI) pour éviter une race condition avec Pusher
    window.dispatchEvent(new CustomEvent('chat-message-sent', {
      detail: {
        conversationId: conversation.id,
        lastMessage: tempMessage.content || (tempMessage.file ? `📎 ${tempMessage.file.name}` : ''),
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
        if (!data.is_online && data.profile?.last_online) {
          setRecipientLastSeen(data.profile.last_online);
        }
      } catch (err) {
        console.error('Error checking online status:', err);
      }
    };
    
    checkOnlineStatus();
  }, [recipientId]);

  // Charger le statut de blocage
  useEffect(() => {
    if (!recipientId || conversation?.isGroup) return;
    api
      .get(`/api/chat/users/${recipientId}/block-status/`)
      .then(({ data }) => {
        setIBlockedThem(data.i_blocked_them);
        setTheyBlockedMe(data.they_blocked_me);
      })
      .catch(() => {});
  }, [recipientId, conversation?.isGroup]);

  // Fermer le menu header au clic extérieur
  useEffect(() => {
    if (!showHeaderMenu) return;
    const handleOutside = (e: MouseEvent) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) {
        setShowHeaderMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showHeaderMenu]);

  // Fermer le emoji picker au clic extérieur
  useEffect(() => {
    if (!showEmojiPicker) return;
    const handleOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showEmojiPicker]);

  // Recherche dans les messages
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchCursor(0);
      return;
    }
    const q = searchQuery.toLowerCase();
    const indices = messages.reduce<number[]>((acc, msg, i) => {
      if (msg.content?.toLowerCase().includes(q)) acc.push(i);
      return acc;
    }, []);
    setSearchResults(indices);
    setSearchCursor(indices.length > 0 ? 0 : 0);
  }, [searchQuery, messages]);

  // Scroll vers le résultat actif
  useEffect(() => {
    if (searchResults.length === 0) return;
    const msgId = messages[searchResults[searchCursor]]?.id;
    if (msgId == null) return;
    const el = messageRefs.current.get(msgId);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [searchCursor, searchResults, messages]);

  // Focus la barre de recherche quand elle s'ouvre
  useEffect(() => {
    if (showSearch) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [showSearch]);

  const handleBlock = async () => {
    if (!recipientId || blockLoading) return;
    setShowHeaderMenu(false);
    if (!window.confirm(`Bloquer ${getDisplayName(recipient) || conversation?.name} ? Vous ne pourrez plus vous envoyer de messages.`)) return;
    setBlockLoading(true);
    try {
      await api.post(`/api/chat/users/${recipientId}/block/`);
      setIBlockedThem(true);
    } catch (err) {
      console.error('Error blocking user:', err);
    } finally {
      setBlockLoading(false);
    }
  };

  const handleUnblock = async () => {
    if (!recipientId || blockLoading) return;
    setShowHeaderMenu(false);
    setBlockLoading(true);
    try {
      await api.delete(`/api/chat/users/${recipientId}/unblock/`);
      setIBlockedThem(false);
    } catch (err) {
      console.error('Error unblocking user:', err);
    } finally {
      setBlockLoading(false);
    }
  };

  // ── Voice recording ──────────────────────────────────────────────
  const formatRecordingTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startRecording = async () => {
    if (iBlockedThem || theyBlockedMe) return;
    if (isRecording) return; // prevent double-start
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg';
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      let cancelled = false;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (cancelled) return; // don't set blob if user cancelled
        const chunks = audioChunksRef.current;
        if (chunks.length === 0) return;
        const blob = new Blob(chunks, { type: mimeType });
        if (blob.size < 100) return; // ignore empty recordings
        setAudioBlob(blob);
        setAudioPreviewUrl(URL.createObjectURL(blob));
      };

      // Attach cancel flag so cancelRecording can signal onstop
      (recorder as any)._cancelled = false;
      Object.defineProperty(recorder, '_setCancelled', {
        value: (v: boolean) => { cancelled = v; },
      });

      recorder.start(250); // collect chunks every 250ms
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      alert('Accès au microphone refusé. Veuillez autoriser le microphone dans les paramètres de votre navigateur.');
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      // Request final chunk then stop
      recorder.requestData();
      recorder.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
    // audioBlob will be set by onstop callback
  };

  const cancelRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder) {
      // Signal onstop to NOT produce a blob
      try { (recorder as any)._setCancelled(true); } catch {}
      if (recorder.state !== 'inactive') {
        recorder.stream?.getTracks().forEach((t) => t.stop());
        recorder.stop();
      }
      mediaRecorderRef.current = null;
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    audioChunksRef.current = [];
    setIsRecording(false);
    setAudioBlob(null);
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
      setAudioPreviewUrl(null);
    }
    setRecordingSeconds(0);
  };

  const sendVoiceMessage = async () => {
    if (!audioBlob || !conversation?.id || isSending) return;
    setIsSending(true);

    const ext = audioBlob.type.includes('webm') ? 'webm' : 'ogg';
    const audioFile = new File([audioBlob], `voice_${Date.now()}.${ext}`, { type: audioBlob.type });

    const tempMessage: PendingMessage = {
      id: `pending-${Date.now()}`,
      content: '',
      sender: user?.username || '',
      timestamp: new Date().toISOString(),
      isPending: true,
      file: audioFile,
    };
    setPendingMessages((prev) => [...prev, tempMessage]);

    // Notify sidebar
    window.dispatchEvent(new CustomEvent('chat-message-sent', {
      detail: {
        conversationId: conversation.id,
        lastMessage: '🎤 Message vocal',
        timestamp: tempMessage.timestamp,
      },
    }));

    // Clean up preview
    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    setAudioBlob(null);
    setAudioPreviewUrl(null);
    setRecordingSeconds(0);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL!;
      const endpoint = conversation.isGroup
        ? `${API_URL}/api/chat/group/${conversation.id}/`
        : `${API_URL}/api/chat/private/${userId}/`;

      const formData = new FormData();
      formData.append('content', '');
      formData.append('attachment', audioFile);
      if (!conversation.isGroup && recipientId) {
        formData.append('recipient', String(recipientId));
      }

      const { data } = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });
      setPendingMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
    } catch (err) {
      setPendingMessages((prev) =>
        prev.map((m) => (m.id === tempMessage.id ? { ...m, isPending: false, isError: true } : m))
      );
      console.error('Error sending voice message:', err);
    } finally {
      setIsSending(false);
    }
  };

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
    <div className="h-full w-full flex flex-col bg-gray-50 overflow-hidden min-h-0">
      {/* Header fixe */}
      <div
        className="shrink-0 sticky top-0 z-10 px-3 py-2 md:p-3 bg-white border-b flex items-center gap-2 md:gap-3 shadow-md cursor-pointer transition-all hover:bg-gray-50"
        onClick={handleProfileClick}
      >
        {/* Bouton de retour - visible uniquement sur mobile */}
        {isMobile && onBackClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBackClick();
            }}
            className="p-1.5 md:p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Retour"
          >
            <ArrowLeftIcon className="h-4 w-4 md:h-5 md:w-5 text-gray-500" />
          </button>
        )}
        
        <div className="h-10 w-10 md:h-12 md:w-12 rounded-full overflow-hidden border border-indigo-100 shadow-sm shrink-0 flex items-center justify-center">
          {conversation.isGroup ? (
            <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-gradient-to-br from-[var(--blue)] to-[var(--blue-ciel)] flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-base md:text-xl text-gray-900 truncate leading-tight">
            {conversation.name || getDisplayName(recipient) || 'Utilisateur'}
          </h2>
          {/* {!conversation.isGroup && recipient?.username && (
            <p className="text-xs text-gray-400">@{recipient.username}</p>
          )} */}
          <p className="text-xs md:text-sm text-gray-500 flex items-center leading-tight mt-0.5">
            {conversation.isGroup ? (
              <>
                <span className="h-2 w-2 rounded-full bg-indigo-400 mr-2"></span>
                Groupe
              </>
            ) : (
              <>
                <span className={`h-2 w-2 rounded-full ${recipientOnline ? 'bg-green-500' : 'bg-gray-400'} mr-2`}></span>
                {recipientOnline ? 'En ligne' : (recipientLastSeen ? formatLastSeen(recipientLastSeen) : 'Hors ligne')}
              </>
            )}
          </p>
        </div>
        {!conversation.isGroup && recipientId && callPhase === 'idle' && (
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            {/* Recherche dans la conversation */}
            <button
              type="button"
              onClick={() => setShowSearch(v => !v)}
              className={`p-1.5 md:p-2 rounded-full transition-colors ${showSearch ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100 text-gray-500'}`}
              title="Rechercher dans la conversation"
              aria-label="Rechercher"
            >
              <MagnifyingGlassIcon className="h-4 w-4 md:h-5 md:w-5" />
            </button>
            <button
              type="button"
              onClick={() =>
                void startCall(recipientId, 'audio', {
                  display_name: getDisplayName(recipient) || conversation.name,
                  image: recipient?.profile?.image ?? null,
                  username: recipient?.username,
                })
              }
              className="p-1.5 md:p-2 rounded-full hover:bg-green-50 text-green-600 transition-colors"
              title="Appel vocal"
              aria-label="Appel vocal"
            >
              <PhoneIcon className="h-4 w-4 md:h-5 md:w-5" />
            </button>
            <button
              type="button"
              onClick={() =>
                void startCall(recipientId, 'video', {
                  display_name: getDisplayName(recipient) || conversation.name,
                  image: recipient?.profile?.image ?? null,
                  username: recipient?.username,
                })
              }
              className="p-1.5 md:p-2 rounded-full hover:bg-indigo-50 text-indigo-600 transition-colors"
              title="Appel vidéo"
              aria-label="Appel vidéo"
            >
              <VideoCameraIcon className="h-4 w-4 md:h-5 md:w-5" />
            </button>
          </div>
        )}
        {!conversation.isGroup && recipientId && (
          <div className="relative" ref={headerMenuRef} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setShowHeaderMenu((v) => !v)}
              className="p-1.5 md:p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Options"
            >
              <EllipsisVerticalIcon className="h-4 w-4 md:h-5 md:w-5 text-gray-500" />
            </button>
            {showHeaderMenu && (
              <div className="absolute right-0 top-full mt-1 z-30 min-w-[180px] rounded-xl border border-gray-100 bg-white py-1 shadow-lg">
                {iBlockedThem ? (
                  <button
                    type="button"
                    disabled={blockLoading}
                    onClick={() => void handleUnblock()}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                  >
                    <CheckCircleIcon className="h-4 w-4" />
                    Débloquer
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={blockLoading || theyBlockedMe}
                    onClick={() => void handleBlock()}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <NoSymbolIcon className="h-4 w-4" />
                    Bloquer
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Barre de recherche dans la conversation */}
      {showSearch && (
        <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-100 shadow-sm">
          <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (searchResults.length === 0) return;
                setSearchCursor(c => (c + 1) % searchResults.length);
              }
              if (e.key === 'Escape') setShowSearch(false);
            }}
            placeholder="Rechercher dans la conversation…"
            className="flex-1 text-sm bg-transparent outline-none text-gray-800 placeholder-gray-400"
          />
          {searchQuery && (
            <span className="text-xs text-gray-400 shrink-0">
              {searchResults.length > 0 ? `${searchCursor + 1}/${searchResults.length}` : '0 résultat'}
            </span>
          )}
          {searchResults.length > 1 && (
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setSearchCursor(c => (c - 1 + searchResults.length) % searchResults.length)}
                className="p-1 rounded hover:bg-gray-100 text-gray-500"
                aria-label="Résultat précédent"
              >
                <ChevronUpIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setSearchCursor(c => (c + 1) % searchResults.length)}
                className="p-1 rounded hover:bg-gray-100 text-gray-500"
                aria-label="Résultat suivant"
              >
                <ChevronDownIcon className="h-4 w-4" />
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowSearch(false)}
            className="p-1 rounded-full hover:bg-gray-100 text-gray-400"
            aria-label="Fermer la recherche"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Bannière de blocage */}
      {(iBlockedThem || theyBlockedMe) && !conversation.isGroup && (
        <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center gap-2 text-sm text-amber-800">
          <NoSymbolIcon className="h-4 w-4 shrink-0" />
          {iBlockedThem
            ? `Vous avez bloqué ${getDisplayName(recipient) || conversation.name}. Les messages sont désactivés.`
            : `Vous ne pouvez pas envoyer de messages à cet utilisateur.`}
          {iBlockedThem && (
            <button
              type="button"
              onClick={() => void handleUnblock()}
              disabled={blockLoading}
              className="ml-auto text-xs font-semibold underline hover:no-underline disabled:opacity-50"
            >
              Débloquer
            </button>
          )}
        </div>
      )}

      {/* Ajuster le conteneur des messages pour tenir compte du header fixe */}
      <div
        ref={messagesContainerRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-2 md:p-4 bg-gray-50 space-y-2 md:space-y-4 mt-[1px]"
      >
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
              const isVoiceMessage = (() => {
                if (!msg.attachment) return false;
                const ext = msg.attachment.split('.').pop()?.split('?')[0]?.toLowerCase();
                const name = decodeURIComponent(msg.attachment.split('/').pop() || '');
                return (ext === 'webm' || ext === 'ogg') && name.startsWith('voice_');
              })();
              const imageOnlyMessage =
                isImageAttachment(msg.attachment) &&
                !msg.content?.trim() &&
                editingMessage?.id !== msg.id;
              const imageWithCaption =
                isImageAttachment(msg.attachment) &&
                Boolean(msg.content?.trim()) &&
                editingMessage?.id !== msg.id;
              const messageTime = new Date(msg.timestamp).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              });
              
              const isSearchMatch = searchResults.includes(messages.indexOf(msg));
              const isActiveMatch = searchResults[searchCursor] === messages.indexOf(msg);

              // Détection sticker : message uniquement composé d'emojis (sans texte)
              const isStickerMessage = (() => {
                if (!msg.content?.trim() || msg.attachment) return false;
                // Supprimer tous les emojis et caractères invisibles, vérifier qu'il ne reste rien
                const withoutEmoji = msg.content.replace(
                  /(\p{Emoji_Presentation}|\p{Extended_Pictographic})\uFE0F?(\u200D(\p{Emoji_Presentation}|\p{Extended_Pictographic})\uFE0F?)*/gu,
                  ''
                ).replace(/\s/g, '');
                return withoutEmoji.length === 0;
              })();
              // Taille du sticker selon le nombre d'emojis
              const stickerCount = isStickerMessage
                ? [...(msg.content?.matchAll(/(\p{Emoji_Presentation}|\p{Extended_Pictographic})\uFE0F?(\u200D(\p{Emoji_Presentation}|\p{Extended_Pictographic})\uFE0F?)*/gu) ?? [])].length
                : 0;
              const stickerSize = stickerCount === 1 ? 'text-6xl' : stickerCount <= 3 ? 'text-5xl' : 'text-4xl';

              return (
                <div
                  key={msg.id}
                  ref={el => { if (el) messageRefs.current.set(msg.id, el); else messageRefs.current.delete(msg.id); }}
                  className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} animate-fadeIn ${isActiveMatch ? 'rounded-lg ring-2 ring-indigo-400 ring-offset-1' : isSearchMatch ? 'rounded-lg ring-1 ring-indigo-200' : ''}`}
                >
                {/* Avatar pour les messages reçus */}
                {!isCurrentUser && (
                  <div className="mr-1.5 md:mr-2 mt-0.5 md:mt-1 shrink-0">
                    <div className="h-7 w-7 md:h-8 md:w-8 rounded-full overflow-hidden border border-gray-200 shadow-sm">
                      <ImageWithFallback
                        src={msg.sender_profile?.image ?? recipient?.profile?.image ?? undefined}
                        alt={msg.sender}
                        className="h-full w-full"
                      />
                    </div>
                  </div>
                )}

                <div className={`max-w-[85%] md:max-w-[75%] lg:max-w-[65%] ${isCurrentUser ? 'items-end' : 'items-start'} flex flex-col group`}>
                  <div
                    className={`relative shadow-sm max-w-full ${
                      imageOnlyMessage
                        ? 'overflow-hidden rounded-md md:rounded-lg p-0'
                        : isStickerMessage
                        ? 'p-1 bg-transparent shadow-none'
                        : isVoiceMessage
                        ? 'px-2 py-2 rounded-2xl'
                        : 'px-2.5 py-2 md:p-3 rounded-md md:rounded-lg'
                    } ${
                      isStickerMessage
                        ? ''
                        : isCurrentUser
                        ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-tr-none'
                        : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                    }`}
                  >
                    {!imageOnlyMessage && !isVoiceMessage && !isStickerMessage && (
                    <>
                    {/* En-tête du message */}
                    <div className="flex justify-between mb-1 md:mb-2 items-center gap-1.5 md:gap-2">
                      <span className={`text-xs md:text-sm font-semibold ${isCurrentUser ? 'text-white/90' : 'text-gray-800'}`}>
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
                          {messageTime}
                        </span>
                      </div>
                    </div>
                    </>
                    )}

                    {imageOnlyMessage && isCurrentUser && (
                      <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuMessageId(openMenuMessageId === msg.id ? null : msg.id);
                            }}
                            className={`p-1 rounded-full bg-black/40 text-white transition-opacity hover:bg-black/55 ${
                              isMobile || openMenuMessageId === msg.id
                                ? 'opacity-100'
                                : 'opacity-0 group-hover:opacity-100'
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
                      </div>
                    )}
                    
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
                        isStickerMessage ? (
                          <div className="flex flex-col items-end gap-0.5">
                            <span className={`${stickerSize} leading-none select-none`}>{msg.content}</span>
                            <span className="text-[10px] text-gray-400">{messageTime}</span>
                          </div>
                        ) : (
                          <p className={`text-xs md:text-sm leading-snug break-words break-all whitespace-pre-wrap ${isCurrentUser ? 'text-white' : 'text-gray-800'}`}>
                            {msg.content}
                          </p>
                        )
                      )
                    )}
                    
                    {/* Pièce jointe */}
                    {msg.attachment && (
                      <div className={imageOnlyMessage ? 'm-0 p-0' : msg.content ? 'mt-1.5 md:mt-2' : ''}>
                        {(() => {
                          const fileUrl = msg.attachment;
                          const fileExtension = fileUrl.split('.').pop()?.split('?')[0]?.toLowerCase();
                          const decodedName = decodeURIComponent(fileUrl.split('/').pop() || '');
                          // isVoice MUST be checked before isVideo (.webm would match video otherwise)
                          const isVoice = (fileExtension === 'webm' || fileExtension === 'ogg') &&
                            decodedName.startsWith('voice_');
                          const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExtension || '');
                          const isVideo = !isVoice && ['mp4', 'webm', 'ogg', 'mov'].includes(fileExtension || '');
                          const isPdf = fileExtension === 'pdf';
                          const isAudio = ['mp3', 'wav', 'aac'].includes(fileExtension || '');
                          
                          const fileName = fileUrl.split('/').pop() || 'fichier';
                          const decodedFileName = decodeURIComponent(fileName);

                          if (isVoice) {
                            return (
                              <VoiceMessagePlayer
                                src={fileUrl}
                                isCurrentUser={isCurrentUser}
                                senderImage={msg.sender_profile?.image ?? recipient?.profile?.image ?? undefined}
                              />
                            );
                          } else if (isImage) {
                            return (
                              <div
                                className={`relative m-0 p-0 leading-none ${
                                  imageWithCaption ? '-mx-2.5 -mb-2 mt-1.5 md:-mx-3 md:-mb-3 md:mt-2 overflow-hidden' : ''
                                }`}
                              >
                                <ImageWithFallback
                                  src={fileUrl}
                                  alt={decodedFileName}
                                  className={`w-full h-auto block max-h-80 object-cover cursor-zoom-in hover:opacity-95 transition-opacity ${
                                    imageOnlyMessage || imageWithCaption
                                      ? 'rounded-none m-0 p-0'
                                      : 'max-h-60 rounded-lg'
                                  }`}
                                  onClick={() => setLightbox({ url: fileUrl, type: 'image', name: decodedFileName })}
                                />
                                {imageOnlyMessage && (
                                  <span className="absolute bottom-2 right-2 z-10 rounded-md bg-black/45 px-1.5 py-0.5 text-[10px] text-white">
                                    {messageTime}
                                  </span>
                                )}
                              </div>
                            );
                          } else if (isVideo) {
                            return (
                              <div
                                className="relative cursor-pointer group rounded-lg overflow-hidden"
                                onClick={() => setLightbox({ url: fileUrl, type: 'video', name: decodedFileName })}
                              >
                                <video
                                  src={fileUrl}
                                  className="max-w-full max-h-52 block pointer-events-none"
                                  preload="metadata"
                                />
                                {/* Play overlay */}
                                <div className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover:bg-black/35 transition-colors">
                                  <div className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow">
                                    <svg className="w-4 h-4 text-gray-800 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M8 5v14l11-7z"/>
                                    </svg>
                                  </div>
                                </div>
                              </div>
                            );
                          } else if (isPdf) {
                            return (
                              <div className={`flex flex-col p-2 md:p-3 ${isCurrentUser ? 'bg-indigo-700/20' : 'bg-gray-100'} rounded-md md:rounded-lg`}>
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
                              <div className="flex items-center gap-2 py-0.5">
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 shrink-0 ${isCurrentUser ? 'text-indigo-200' : 'text-indigo-400'}`} viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071a1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243a1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828a1 1 0 010-1.415z" clipRule="evenodd" />
                                </svg>
                                <audio src={fileUrl} controls className="h-8 w-44 min-w-0" />
                              </div>
                            );
                          } else {
                            // Pour les autres types de fichiers
                            return (
                              <div className={`flex items-center p-2 md:p-3 ${isCurrentUser ? 'bg-indigo-700/20' : 'bg-gray-100'} rounded-md md:rounded-lg`}>
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
            <div className="max-w-[85%] md:max-w-[75%] lg:max-w-[65%] items-end flex flex-col">
              <div className="px-2.5 py-2 md:p-3 rounded-md md:rounded-lg shadow-sm max-w-full bg-gradient-to-br from-indigo-500/80 to-indigo-600/80 text-white rounded-tr-none">
                <div className="flex justify-between mb-1 md:mb-2 items-center">
                  <span className="text-xs md:text-sm font-semibold text-white/90">Vous</span>
                  <span className="ms-2 text-xs text-white/70">
                    {new Date(msg.timestamp).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-xs md:text-sm leading-snug break-words break-all whitespace-pre-wrap text-white">{msg.content}</p>

                {msg.file && (
                  <PendingFilePreview file={msg.file} />
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

      {/* Bas de page : frappe + saisie (reste au-dessus du clavier) */}
      <div className="shrink-0 z-10">
        {typingUsers.length > 0 && (
          <div className="px-3 md:px-4 pb-1 flex items-center gap-2 bg-gray-50">
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1.5 shadow-sm">
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

      <div className="bg-white border-t shadow-lg">
        {file && (
          <div className="px-3 pt-2 pb-1.5 md:px-4 md:pt-3 md:pb-2 border-b border-gray-100 bg-gray-50">
            <div className="relative inline-flex items-center gap-3 max-w-full rounded-xl border border-indigo-200 bg-white p-2 pr-10 shadow-sm">
              {filePreviewUrl ? (
                <img
                  src={filePreviewUrl}
                  alt={file.name}
                  className="h-16 w-16 rounded-lg object-cover shrink-0 border border-gray-200"
                />
              ) : file.type.startsWith('video/') ? (
                <div className="h-16 w-16 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                  <VideoCameraIcon className="h-8 w-8 text-indigo-500" />
                </div>
              ) : (
                <div className="h-16 w-16 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <DocumentIcon className="h-8 w-8 text-gray-500" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate max-w-[220px]">{file.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                <p className="text-xs text-indigo-600 mt-0.5">Prêt à envoyer</p>
              </div>
              <button
                type="button"
                onClick={clearSelectedFile}
                className="absolute top-1.5 right-1.5 p-1 rounded-full bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-600 transition-colors"
                aria-label="Retirer le fichier"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <div className="max-w-[100%] mx-auto px-3 py-1.5 md:py-2 md:px-4 flex items-center gap-2">
          {/* Prévisualisation du message vocal */}
          {audioBlob && !isRecording && (
            <div className="flex-1 flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-full px-3 py-1.5">
              <MicrophoneIcon className="h-4 w-4 text-indigo-500 shrink-0" />
              <audio src={audioPreviewUrl ?? undefined} controls className="flex-1 h-8" style={{ minWidth: 0 }} />
              <button
                type="button"
                onClick={cancelRecording}
                className="p-1 rounded-full hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors shrink-0"
                aria-label="Annuler"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => void sendVoiceMessage()}
                disabled={isSending}
                className="p-1.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-500 disabled:opacity-50 transition-colors shrink-0"
                aria-label="Envoyer le message vocal"
              >
                <PaperAirplaneIcon className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Timer d'enregistrement */}
          {isRecording && (
            <div className="flex-1 flex items-center gap-2 bg-red-50 border border-red-200 rounded-full px-4 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
              <span className="text-sm font-mono text-red-600 font-semibold">
                {formatRecordingTime(recordingSeconds)}
              </span>
              <span className="text-xs text-red-500 flex-1">Enregistrement…</span>
              <button
                type="button"
                onClick={cancelRecording}
                className="text-xs text-gray-500 hover:text-red-500 transition-colors"
                aria-label="Annuler l'enregistrement"
              >
                Annuler
              </button>
            </div>
          )}

          {/* Zone normale (texte + fichier) */}
          {!isRecording && !audioBlob && (
            <>
              <label className={`p-1.5 md:p-2 rounded-full transition-colors cursor-pointer ${file ? 'bg-indigo-100' : 'hover:bg-gray-100'}`}>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={e => handleFileSelect(e.target.files?.[0] || null)}
                  className="hidden"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip"
                />
                <PaperClipIcon className={`h-5 w-5 ${file ? 'text-indigo-600' : 'text-gray-500'}`} />
              </label>

              {/* Emoji picker */}
              <div className="relative" ref={emojiPickerRef}>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(v => !v)}
                  className={`p-1.5 md:p-2 rounded-full transition-colors ${showEmojiPicker ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100 text-gray-500'}`}
                  aria-label="Emoji"
                  title="Emoji"
                >
                  <FaceSmileIcon className="h-5 w-5" />
                </button>
                {showEmojiPicker && (
                  <div className="absolute bottom-12 left-0 z-50 shadow-xl rounded-2xl overflow-hidden">
                    <EmojiPicker
                      onEmojiClick={({ emoji }) => {
                        setNewMessage(prev => prev + emoji);
                        inputRef.current?.focus();
                      }}
                      height={380}
                      width={320}
                      searchPlaceholder="Rechercher…"
                      previewConfig={{ showPreview: false }}
                    />
                  </div>
                )}
              </div>

              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={handleTyping}
                onFocus={handleInputFocus}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder={iBlockedThem || theyBlockedMe ? 'Impossible d\'envoyer un message…' : 'Écrivez un message...'}
                className="flex-1 px-3 py-2 md:px-4 md:py-2.5 bg-gray-50 border border-gray-200 rounded-full text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800 placeholder-gray-400 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={iBlockedThem || theyBlockedMe}
              />

              {/* Bouton envoi OU micro selon contenu */}
              {newMessage.trim() || file ? (
                <button
                  onClick={sendMessage}
                  disabled={isSending}
                  className="p-2 md:p-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-500 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <PaperAirplaneIcon className="h-4 w-4 md:h-5 md:w-5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void startRecording()}
                  disabled={isSending || iBlockedThem || theyBlockedMe}
                  className="p-2 md:p-2.5 bg-gray-100 text-gray-600 rounded-full hover:bg-indigo-100 hover:text-indigo-600 disabled:opacity-50 transition-colors focus:outline-none"
                  title="Cliquer pour démarrer l'enregistrement vocal"
                  aria-label="Enregistrer un message vocal"
                >
                  <MicrophoneIcon className="h-4 w-4 md:h-5 md:w-5" />
                </button>
              )}
            </>
          )}

          {/* Bouton stop pendant enregistrement */}
          {isRecording && (
            <button
              type="button"
              onClick={stopRecording}
              className="p-2 md:p-2.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors focus:outline-none shrink-0"
              aria-label="Arrêter l'enregistrement"
            >
              <StopIcon className="h-4 w-4 md:h-5 md:w-5" />
            </button>
          )}
        </div>
      </div>
      </div>
      {/* Lightbox plein écran image / vidéo */}
      <MediaLightbox media={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}
