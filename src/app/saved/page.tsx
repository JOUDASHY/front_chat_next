'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/axiosClient';
import {
  StarIcon,
  ArrowLeftIcon,
  ChatBubbleLeftRightIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

interface SavedMessage {
  id: number;
  content: string;
  sender: string;
  sender_profile?: { image: string | null };
  timestamp: string;
  is_favorite?: boolean;
  is_pinned?: boolean;
  room?: number | null;
  recipient?: number | null;
}

export default function SavedPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'favorite' | 'pinned'>('all');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/api/chat/saved/?type=${filter}`);
        setMessages(data);
      } catch (err) {
        console.error('Error loading saved messages:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [filter]);

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-[#f8fafc] to-[#e2e8f0] dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Retour"
        >
          <ArrowLeftIcon className="h-5 w-5 text-gray-700 dark:text-gray-200" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          <StarIcon className="h-5 w-5 inline mr-2 text-yellow-500" />
          Messages enregistrés
        </h1>
      </header>

      {/* Filter tabs */}
      <div className="flex gap-2 px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        {(['all', 'favorite', 'pinned'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-[var(--blue)] text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {f === 'all' ? 'Tous' : f === 'favorite' ? '⭐ Favoris' : '📌 Épinglés'}
          </button>
        ))}
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 border-4 border-[var(--blue)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
            <ChatBubbleLeftRightIcon className="h-12 w-12 mb-3" />
            <p className="text-sm">Aucun message enregistré</p>
            <p className="text-xs mt-1">
              Utilisez les options d&apos;un message pour l&apos;ajouter aux favoris ou l&apos;épingler
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:shadow-sm transition-shadow"
            >
              <div className="shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center">
                {msg.sender_profile?.image ? (
                  <img
                    src={msg.sender_profile.image}
                    alt={msg.sender}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <UserCircleIcon className="h-6 w-6 text-indigo-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {msg.sender}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(msg.timestamp).toLocaleString('fr-FR', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                  {msg.is_pinned && <span title="Épinglé">📌</span>}
                  {msg.is_favorite && <span title="Favori">⭐</span>}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                  {msg.content || '(pièce jointe)'}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
