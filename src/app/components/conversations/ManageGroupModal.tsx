'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon, MagnifyingGlassIcon, TrashIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import api from '@/lib/axiosClient';

interface User {
  id: number;
  username: string;
  email: string;
  profile?: {
    image: string;
  };
}

interface Room {
  id: number;
  name: string;
  participants: User[];
}

interface ManageGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: number;
  currentUserId: number | undefined;
  onGroupUpdated?: () => void;
}

export default function ManageGroupModal({ isOpen, onClose, roomId, currentUserId, onGroupUpdated }: ManageGroupModalProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [groupName, setGroupName] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);

  useEffect(() => {
    if (isOpen && roomId) {
      fetchRoomDetails();
      fetchAllUsers();
      setShowAddMember(false);
      setSearchQuery('');
    }
  }, [isOpen, roomId]);

  const fetchRoomDetails = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get(`/api/chat/rooms/${roomId}/`);
      setRoom(data);
      setGroupName(data.name);
      setSelectedUserIds(data.participants.map((p: User) => p.id));
    } catch (err) {
      console.error('Erreur chargement groupe:', err);
      setError('Impossible de charger les informations du groupe.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const { data } = await api.get('/api/chat/users/');
      setAllUsers(data);
    } catch (err) {
      console.error('Erreur chargement utilisateurs:', err);
    }
  };

  if (!isOpen) return null;

  const currentParticipants = allUsers.filter(u => selectedUserIds.includes(u.id));
  const availableUsers = allUsers.filter(u => 
    !selectedUserIds.includes(u.id) && 
    (u.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
     u.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const toggleUserSelection = (userId: number) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleUpdateGroup = async () => {
    if (!groupName.trim()) {
      setError('Le nom du groupe ne peut pas être vide.');
      return;
    }

    // Garder l'utilisateur actuel dans le groupe au cas où il s'enlève par erreur
    let finalParticipants = [...selectedUserIds];
    if (currentUserId && !finalParticipants.includes(currentUserId)) {
      finalParticipants.push(currentUserId);
    }

    try {
      setIsSubmitting(true);
      setError(null);
      
      await api.patch(`/api/chat/rooms/${roomId}/`, {
        name: groupName.trim(),
        participants: finalParticipants
      });

      if (onGroupUpdated) onGroupUpdated();
      onClose();
    } catch (err) {
      console.error('Erreur modification groupe:', err);
      setError('Une erreur est survenue lors de la modification du groupe.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm('Êtes-vous sûr de vouloir quitter ce groupe ? Vous ne recevrez plus de messages.')) return;
    
    try {
      setIsSubmitting(true);
      const finalParticipants = selectedUserIds.filter(id => id !== currentUserId);
      
      await api.patch(`/api/chat/rooms/${roomId}/`, {
        participants: finalParticipants
      });

      // Recharger la page pour mettre à jour la sidebar et fermer le chat
      window.location.href = '/chat';
    } catch (err) {
      console.error('Erreur pour quitter le groupe:', err);
      setError('Erreur lors de la sortie du groupe.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-blue">
          <h2 className="text-lg font-bold text-white">Gérer le Groupe</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20 transition-colors">
            <XMarkIcon className="h-6 w-6 text-white" />
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-jaune border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <div className="p-4 flex flex-col flex-1 overflow-hidden overflow-y-auto">
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl">
                {error}
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nom du groupe</label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-jaune outline-none transition-all text-gray-800"
                maxLength={50}
              />
            </div>

            <div className="mb-4 flex items-center justify-between">
              <label className="block text-sm font-semibold text-gray-700">
                Membres ({currentParticipants.length})
              </label>
              <button 
                onClick={() => setShowAddMember(!showAddMember)}
                className="flex items-center gap-1 text-sm text-blue hover:text-blue-ciel font-medium"
              >
                <UserPlusIcon className="h-4 w-4" />
                {showAddMember ? 'Masquer' : 'Ajouter'}
              </button>
            </div>

            {/* Section Ajouter des membres */}
            {showAddMember && (
              <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="relative mb-2">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue/30 outline-none"
                  />
                </div>
                <div className="max-h-32 overflow-y-auto">
                  {availableUsers.length === 0 ? (
                    <p className="text-xs text-center text-gray-500 py-2">Aucun utilisateur trouvé</p>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {availableUsers.map(u => (
                        <li key={u.id} className="flex items-center justify-between py-2">
                          <span className="text-sm text-gray-700">{u.username}</span>
                          <button
                            onClick={() => toggleUserSelection(u.id)}
                            className="text-xs px-2 py-1 bg-jaune text-white rounded hover:bg-yellow-500"
                          >
                            Ajouter
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* Liste des membres actuels */}
            <div className="flex-1 overflow-y-auto border border-gray-100 rounded-xl bg-gray-50/50 p-2">
              <ul className="divide-y divide-gray-100">
                {currentParticipants.map(u => (
                  <li key={u.id} className="flex items-center justify-between py-2 px-2">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue/10 flex items-center justify-center overflow-hidden">
                        {u.profile?.image ? (
                          <img src={u.profile.image.startsWith('http') ? u.profile.image : `${process.env.NEXT_PUBLIC_API_URL}${u.profile.image}`} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xs font-bold text-blue">{u.username.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-800">
                          {u.username} {u.id === currentUserId && "(Moi)"}
                        </span>
                      </div>
                    </div>
                    {u.id !== currentUserId && (
                      <button
                        onClick={() => toggleUserSelection(u.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Retirer du groupe"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <button
            onClick={handleLeaveGroup}
            disabled={isSubmitting || isLoading}
            className="px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
          >
            Quitter le groupe
          </button>
          
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleUpdateGroup}
              disabled={isSubmitting || isLoading || !groupName.trim() || selectedUserIds.length === 0}
              className="px-6 py-2 text-sm font-medium text-white bg-blue rounded-xl hover:bg-blue-ciel transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
        
      </div>
    </div>
  );
}
