'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { User, Profile } from '@/types';
import api from '@/lib/axiosClient';
import {
  MapPinIcon,
  HeartIcon,
  UserCircleIcon,
  CalendarIcon,
  ArrowLeftIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

interface UserProfile extends User {
  profile: Profile;
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.userId as string;

  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data } = await api.get<UserProfile>(`/api/chat/users/${userId}`);
        setUser(data);
      } catch {
        setError('Failed to load user profile');
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) fetchUserProfile();
  }, [userId]);

  const handleBack = () => router.back();

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[var(--blue)]"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-jaune/20 mb-4">
              <UserCircleIcon className="h-10 w-10 text-jaune" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Profil introuvable</h2>
            <p className="text-red-500 mb-6">{error || 'Utilisateur non trouvé'}</p>
            <button
              onClick={handleBack}
              className="px-6 py-3 bg-blue text-white rounded-lg hover:bg-blue-ciel transition-colors flex items-center justify-center mx-auto"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Retour
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header fixe */}
      <div className="fixed top-0 left-0 right-0 bg-[var(--blue)] shadow-sm z-30 h-14 flex items-center px-4">
        <button
          onClick={handleBack}
          className="p-2 hover:bg-[var(--blue-ciel)]/20 rounded-full transition-colors"
          aria-label="Retour"
        >
          <ArrowLeftIcon className="h-6 w-6 text-white" />
        </button>
      </div>

      {/* Container principal avec marge pour le header */}
      <div className="pt-14">
        {/* Bannière et photo de profil */}
        <div className="relative">
          <div className="h-[350px] w-full relative overflow-hidden">
            <div className="absolute inset-0">
              <img
                src={user.profile?.cover_image || "https://thumbs.dreamstime.com/z/b%C3%A2timents-d-une-ville-avec-un-march%C3%A9-en-plein-air-antananarivo-dans-le-jour-ensoleill%C3%A9-vue-a%C3%A9rienne-de-madagascar-190866592.jpg"}
                alt="Cover"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://thumbs.dreamstime.com/z/b%C3%A2timents-d-une-ville-avec-un-march%C3%A9-en-plein-air-antananarivo-dans-le-jour-ensoleill%C3%A9-vue-a%C3%A9rienne-de-madagascar-190866592.jpg";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />
            </div>
          </div>
          
          {/* Photo de profil */}
          <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-16 lg:-bottom-8 lg:left-[max(calc(50%-400px),2rem)]">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="relative group"
            >
              <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-full border-4 border-white shadow-xl overflow-hidden bg-white">
                <img
                  src={user.profile?.image || '/default-avatar.png'}
                  alt={user.username}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/default-avatar.png';
                  }}
                />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Contenu principal */}
        <div className="max-w-7xl mx-auto px-4 mt-20 lg:mt-8">
          {/* En-tête avec nom et badges */}
          <div className="lg:ml-[200px] mb-8">
            <h1 className="text-3xl font-bold text-gray-900">{user.username}</h1>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge icon="✉️" value={user.email} />
              {user.first_name && <Badge icon="👤" value={user.first_name} />}
              {user.last_name && <Badge icon="👥" value={user.last_name} />}
            </div>
            
            {/* Bouton message */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="mt-4 px-6 py-2.5 bg-[var(--blue)] text-white rounded-lg hover:bg-[var(--blue-ciel)] transition-colors"
            >
              ✉️ Envoyer un message
            </motion.button>
          </div>

          {/* Grille des cartes d'information - Layout plus large */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Colonne de gauche */}
            <div className="lg:col-span-1 space-y-6">
              <ProfileCard
                title="Informations personnelles"
                icon="📌"
                items={[
                  { label: 'Lieu', value: user.profile.lieu || undefined },
                  { label: 'Date de naissance', value: user.profile.date_naiv ? new Date(user.profile.date_naiv).toLocaleDateString('fr-FR') : undefined },
                  { label: 'Genre', value: user.profile.gender || undefined },
                  { label: 'Téléphone', value: user.profile.phone_number || undefined },
                  { label: 'Statut', value: user.profile.status || undefined }
                ]}
              />
              
              <ProfileCard
                title="Statut"
                icon="💫"
                items={[
                  { label: 'En ligne', value: user.profile.status || 'Non disponible' }
                ]}
              />
            </div>

            {/* Colonne principale */}
            <div className="lg:col-span-3 space-y-6">
              <ProfileCard
                title="À propos"
                icon="📝"
                items={[
                  { label: 'Bio', value: user.profile.bio || undefined },
                  { label: 'Passions', value: user.profile.passion || undefined },
                  { label: 'Profession', value: user.profile.profession || undefined },
                  { label: 'Site web', value: user.profile.website || undefined }
                ]}
              />

              <ProfileCard
                title="Autres informations"
                icon="ℹ️"
                items={[
                  { label: 'Bio', value: user.profile.bio || undefined },
                  { label: 'Dernière connexion', value: user.profile.last_seen ? new Date(user.profile.last_seen).toLocaleString('fr-FR') : undefined },
                  { label: 'Compte vérifié', value: user.profile.is_verified ? 'Oui' : 'Non' },
                  { label: 'Préférence de thème', value: user.profile.theme_preference || undefined },
                  { label: 'Préférence de langue', value: user.profile.language_preference || undefined },
                  { label: 'Âge', value: user.profile.age ? `${user.profile.age} ans` : undefined },
                  { label: 'Date de création', value: user.profile.created_at ? new Date(user.profile.created_at).toLocaleString('fr-FR') : undefined },
                  { label: 'Date de mise à jour', value: user.profile.updated_at ? new Date(user.profile.updated_at).toLocaleString('fr-FR') : undefined }
                ]}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const ProfileCard = ({ title, icon, items }: { title: string; icon: string; items: { label: string; value?: string }[] }) => (
  <div className="bg-[var(--blue)] p-6 rounded-xl border border-[var(--blue-ciel)]/30 hover:border-[var(--blue-ciel)] transition-all">
    <div className="flex items-center gap-3 mb-4">
      <span className="text-2xl">{icon}</span>
      <h3 className="text-xl font-semibold text-white">{title}</h3>
    </div>
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <span className="text-gray-300 flex-[0_0_120px]">{item.label}</span>
          <span className="text-white flex-1 font-medium">
            {item.value || 'Non spécifié'}
          </span>
        </div>
      ))}
    </div>
  </div>
);

const Badge = ({ icon, value }: { icon: string; value: string }) => (
  <motion.div
    className="flex items-center gap-2 px-4 py-2 bg-[var(--blue)] text-white rounded-full border border-[var(--blue-ciel)]/30"
    whileHover={{ y: -2 }}
  >
    <span>{icon}</span>
    <span>{value}</span>
  </motion.div>
);
