'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import api from '@/lib/axiosClient';

interface User {
  id: number;
  username: string;
  email: string;
  profile?: {
    image: string;
  };
}

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  allUsers: User[];
  currentUserId: number | undefined;
  onGroupCreated?: () => void;
}

function getParticipantImageUrl(image?: string) {
  if (!image) return '/default-avatar.svg';
  return image.startsWith('http') ? image : `${process.env.NEXT_PUBLIC_API_URL}${image}`;
}

export default function CreateGroupModal({ isOpen, onClose, allUsers, currentUserId, onGroupCreated }: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Réinitialiser le formulaire à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setGroupName('');
      setSearchQuery('');
      setSelectedUserIds([]);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredUsers = allUsers.filter(u => 
    u.id !== currentUserId && 
    (u.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
     u.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const toggleUserSelection = (userId: number) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError('Veuillez entrer un nom pour le groupe.');
      return;
    }
    if (selectedUserIds.length === 0) {
      setError('Veuillez sélectionner au moins un membre.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      
      await api.post('/api/chat/rooms/', {
        name: groupName.trim(),
        participants: selectedUserIds
      });

      if (onGroupCreated) onGroupCreated();
      onClose();
    } catch (err) {
      console.error('Erreur création groupe:', err);
      setError('Une erreur est survenue lors de la création du groupe.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-blue">
          <h2 className="text-lg font-bold text-white">Nouveau Groupe</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20 transition-colors">
            <XMarkIcon className="h-6 w-6 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-1 overflow-hidden">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nom du groupe</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Ex: Team Dev, Amis, Projet X..."
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-jaune focus:border-transparent outline-none transition-all text-gray-800"
              maxLength={50}
            />
          </div>

          <div className="mb-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Participants ({selectedUserIds.length} sélectionné{selectedUserIds.length > 1 ? 's' : ''})
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Rechercher des membres..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue/30 outline-none text-sm text-gray-800"
              />
            </div>
          </div>

          {/* User List */}
          <div className="flex-1 overflow-y-auto mt-2 border border-gray-100 rounded-xl bg-gray-50/50">
            {filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                Aucun utilisateur trouvé.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {filteredUsers.map(u => (
                  <li 
                    key={u.id}
                    onClick={() => toggleUserSelection(u.id)}
                    className="flex items-center p-3 hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(u.id)}
                        readOnly
                        className="w-4 h-4 text-jaune border-gray-300 rounded focus:ring-jaune"
                      />
                    </div>
                    <div className="ml-3 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full overflow-hidden bg-blue/10 flex-shrink-0">
                        <img
                          src={getParticipantImageUrl(u.profile?.image)}
                          alt={u.username}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/default-avatar.svg';
                          }}
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-800">{u.username}</span>
                        <span className="text-xs text-gray-500">{u.email}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleCreateGroup}
            disabled={isSubmitting || !groupName.trim() || selectedUserIds.length === 0}
            className="px-6 py-2 text-sm font-medium text-white bg-blue rounded-xl hover:bg-blue-ciel transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Création...' : 'Créer le groupe'}
          </button>
        </div>
        
      </div>
    </div>
  );
}
