// src/app/profile/[userId]/page.tsx

/**  
 * Désactive le pré‑rendu statique pour cette page  
 * et passe en rendu à la volée (SSR) à chaque requête  
 */
export const dynamic = 'force-dynamic';

/**
 * Autorise tous les params dynamiques,
 * même ceux qui n’ont pas été listés via generateStaticParams
 */
export const dynamicParams = true;

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { User, Profile } from '@/types';
import api from '@/lib/axiosClient';

interface UserProfile extends User {
  profile: Profile;
}

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.userId as string;

  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data } = await api.get<UserProfile>(`/api/chat/users/${userId}`);
        setUser(data);
      } catch (err) {
        setError('Failed to load user profile');
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchUserProfile();
    }
  }, [userId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">{error || 'User not found'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col items-center mb-6">
          <img
            src={user.profile.image || '/default-avatar.png'}
            alt="Profile"
            className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
          />
          <h1 className="text-2xl font-bold mt-4">{user.username}</h1>
          <p className="text-gray-500">{user.email}</p>
        </div>

        <div className="space-y-4">
          <div className="border-b pb-4">
            <label className="block text-gray-600 font-medium mb-2">Lieu</label>
            <p className="text-gray-800">{user.profile.lieu || 'Non spécifié'}</p>
          </div>

          <div className="border-b pb-4">
            <label className="block text-gray-600 font-medium mb-2">Bio</label>
            <p className="text-gray-800">{user.profile.passion || 'Aucune bio pour le moment'}</p>
          </div>

          <div className="border-b pb-4">
            <label className="block text-gray-600 font-medium mb-2">Statut</label>
            <p className="text-gray-800">{user.profile.status || 'Non spécifié'}</p>
          </div>

          <div className="border-b pb-4">
            <label className="block text-gray-600 font-medium mb-2">Date de naissance</label>
            <p className="text-gray-800">
              {user.profile.date_naiv
                ? new Date(user.profile.date_naiv).toLocaleDateString('fr-FR')
                : 'Non spécifiée'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
