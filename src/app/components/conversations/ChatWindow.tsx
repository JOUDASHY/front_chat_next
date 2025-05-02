'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axiosClient';
import {
  UserCircleIcon,
  PaperAirplaneIcon,
  EllipsisVerticalIcon,
  PaperClipIcon
} from '@heroicons/react/24/outline';
import Pusher from 'pusher-js';
import { useRouter } from 'next/navigation';

interface Message {
  id: number;
  content: string;
  sender: string;
  timestamp: string;
  attachment?: string; // Add attachment field
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

interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface ChatWindowProps {
  conversation: {
    id: string | number;    // ID de l'autre utilisateur (pour private) ou de la conversation de groupe
    name: string;
    isGroup: boolean;
  } | null;
  userId: string | number | null; // ID de l'utilisateur connecté
}

export default function ChatWindow({ conversation, userId }: ChatWindowProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [pusherClient, setPusherClient] = useState<Pusher | null>(null);
  const [user, setUser] = useState<User | null>(null); // Ajout de l'état pour l'utilisateur connecté

  const handleProfileClick = () => {
    if (conversation && !conversation.isGroup && messages[0]?.recipient?.id) {
      router.push(`/profile/${messages[0].recipient.id}`);
    }
  };

  // Chargement initial des messages (private OU group)
  useEffect(() => {
    if (!conversation?.id || userId == null) return;

    const loadMessages = async () => {
      try {
        const endpoint = conversation.isGroup
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/chat/group/${conversation.id}/`
          : `${process.env.NEXT_PUBLIC_API_URL}/api/chat/private/${userId}/`;
        console.log('🛠️ Loading messages from', endpoint);
        const { data } = await api.get<Message[]>(endpoint);
        setMessages(data);
      } catch (err) {
        console.error('Error loading messages:', err);
      }
    };
    loadMessages();
  }, [conversation?.id, userId]);

  // Initialisation unique du client Pusher
  useEffect(() => {
    if (userId == null) return;

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
    pusher.connection.bind('state_change', ({ previous, current }: { previous: string; current: string }) =>
      console.log('Pusher state', previous, '→', current)
    );
    pusher.connection.bind('error', (err: Error) =>
      console.error('Pusher connection error:', err)
    );
    setPusherClient(pusher);
    return () => { pusher.disconnect(); };
  }, [userId]);

  // (Dé)souscription au canal correct pour privé OU group
  useEffect(() => {
    if (!pusherClient || !conversation?.id || userId == null || !user) return;

    let channelName: string;
    if (conversation.isGroup) {
      channelName = `group-chat-${conversation.id}`;
    } else {
      // pour privé : tri des deux IDs
      const a = Math.min(Number(userId), user.id);
      const b = Math.max(Number(userId), user.id);
      channelName = `private-chat-${a}-${b}`;
    }

    console.log('→ Pusher subscribe', channelName);
    const channel = pusherClient.subscribe(channelName);
    channel.bind('new-message', handleNewMessage);

    return () => {
      console.log('← Pusher unsubscribe', channelName);
      channel.unbind_all();
      pusherClient.unsubscribe(channelName);
    };
  }, [pusherClient, conversation?.id, userId, user]);

  const handleNewMessage = (message: Message) => {
    console.log('New message received:', message);
    setMessages(prev => {
      console.log('Updating messages state with new message:', message);
      return [...prev, message];
    });
  };

  const sendMessage = async () => {
    if (!newMessage.trim() && !file || !conversation?.id || isSending || userId == null) return;
    setIsSending(true);
    try {
      const endpoint = conversation.isGroup
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/chat/group/${conversation.id}/`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/chat/private/${userId}/`;
  
      const formData = new FormData();
      formData.append('content', newMessage);
      if (file) {
        formData.append('attachment', file);
      }
  
      // Log the formData entries
      for (let pair of formData.entries()) {
        console.log(pair[0] + ', ' + pair[1]);
      }
  
      const response = await api.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('Message sent:', response.data);
      setNewMessage('');
      setFile(null);
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  if (!conversation) {
    return (
      <div className="fixed right-0 top-0 bottom-0 left-[384px] bg-gray-50 flex flex-col">
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
    <div className="fixed right-0 top-0 bottom-0 left-[384px] bg-gray-50 flex flex-col">
      {/* Header */}
      <div
        className="p-4 bg-white border-b flex items-center gap-3 shadow-md cursor-pointer"
        onClick={handleProfileClick}
      >
        <div className="h-12 w-12 rounded-full overflow-hidden border-1 border-black">
          {messages[0]?.recipient?.profile?.image ? (
            <img
              src={messages[0].recipient.profile.image}
              alt={conversation.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-indigo-100 flex items-center justify-center">
              <UserCircleIcon className="h-8 w-8 text-indigo-600" />
            </div>
          )}
        </div>
        <div>
          <h2 className="font-bold text-xl text-gray-900">{conversation.name}</h2>
          <p className="text-sm text-gray-500">
            {conversation.isGroup ? 'Groupe' : 'En ligne'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
        {messages.map(msg => {
          const isCurrentUser = msg.sender === user?.username;
          return (
            <div key={msg.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
              {/* Afficher l'avatar uniquement pour les messages reçus */}
              {!isCurrentUser && (
                <div className="mr-2">
                  <div className="h-8 w-8 rounded-full overflow-hidden">
                    {messages[0]?.recipient?.profile?.image ? (
                      <img
                        src={messages[0].recipient.profile.image}
                        alt={messages[0].recipient.username}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-indigo-100 flex items-center justify-center">
                        <UserCircleIcon className="h-6 w-6 text-indigo-600" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="max-w-xs md:max-w-md lg:max-w-lg">
                <div
                  className={`p-3 rounded-lg shadow-md ${
                    isCurrentUser
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-white text-gray-800 rounded-tl-none'
                  }`}
                >
                  {/* Affichage du nom de l'expéditeur en haut du message */}
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-semibold text-black">
                      {isCurrentUser ? 'Vous' : msg.sender}
                    </span>
                    <span className={`ms-2 text-xs ${isCurrentUser ? 'text-white/70' : 'text-gray-400'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className={`text-sm ${isCurrentUser ? 'text-white' : 'text-gray-800'}`}>
                    {msg.content}
                  </p>
                  {msg.attachment && (
                    <div className="mt-2">
                      <a href={msg.attachment} target="_blank" rel="noopener noreferrer" className="text-blue-500">
                        View attachment
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t flex gap-2 shadow-md">
        <input
          type="text"
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Écrivez un message..."
          className="flex-1 px-4 py-3 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-ciel focus:border-blue-ciel text-gray-800 placeholder-gray-400"
          disabled={isSending}
        />
        <label className="cursor-pointer">
          <input
            type="file"
            onChange={e => setFile(e.target.files?.[0] || null)}
            className="hidden"
          />
          <PaperClipIcon className="h-6 w-6 text-gray-500" />
        </label>
        <button
          onClick={sendMessage}
          disabled={isSending}
          className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-500 disabled:opacity-50 transition"
        >
          <PaperAirplaneIcon className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
