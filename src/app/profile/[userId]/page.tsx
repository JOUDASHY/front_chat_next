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
    <div className="fixed inset-0 bg-white overflow-auto">
      {/* Bouton Retour */}
      <button
        onClick={handleBack}
        className="fixed top-4 left-4 z-20 p-2 bg-[var(--blue)] hover:bg-[var(--blue-ciel)] text-white rounded-full shadow-lg transition-colors"
        aria-label="Retour"
      >
        <ArrowLeftIcon className="h-6 w-6" />
      </button>

      {/* Conteneur central */}
      <div className="max-w-xl mx-auto py-6 px-4 relative z-10 min-h-screen flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-[var(--blue)] rounded-3xl shadow-2xl backdrop-blur-xl border border-white/10 overflow-hidden"
        >
          {/* Cover */}
          <div className="h-32 bg-[var(--blue-ciel)]" />

          {/* Avatar */}
          <div className="flex justify-center -mt-12 mb-4">
            <motion.div whileHover={{ scale: 1.05 }} className="relative group">
              <div className="absolute inset-0 rounded-full bg-[var(--jaune)] blur-lg opacity-30 group-hover:opacity-50 transition-opacity" />
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/30 shadow-lg relative z-10">
                <img
                  src={user.profile.image || '/default-avatar.png'}
                  alt={user.username}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/default-avatar.png';
                  }}
                />
              </div>
            </motion.div>
          </div>

          {/* Contenu */}
          <div className="pb-8 px-6 space-y-6">
            {/* Nom & Badges */}
            <div className="text-center">
              <motion.h1
                className="text-2xl font-bold text-[var(--light)]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {user.username}
              </motion.h1>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Badge icon="✉️" value={user.email} />
                {user.first_name && <Badge icon="👤" value={user.first_name} />}
                {user.last_name && <Badge icon="👥" value={user.last_name} />}
              </div>
            </div>

            {/* Grille responsive des cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ProfileCard
                title="Informations personnelles"
                icon="📌"
              items={[
                  { label: 'Lieu', value: user.profile.lieu || undefined },
                  { label: 'Date de naissance', value: user.profile.date_naiv ? new Date(user.profile.date_naiv).toLocaleDateString('fr-FR') : undefined },
                  { label: 'Genre', value: user.profile.gender || undefined },
                  { label: 'Numéro de téléphone', value: user.profile.phone_number || undefined },
                  { label: 'Statut', value: user.profile.status || undefined }
                ]}
              />

              <ProfileCard
                title="À propos"
                icon="📝"
                 items={[
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

            {/* CTA */}
            <div className="mt-8 flex justify-center">
              <button className="px-6 py-3 bg-blue text-white rounded-lg hover:bg-blue-ciel transition-colors">
                Envoyer un message
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

const ProfileCard = ({
  title,
  icon,
  items
}: {
  title: string;
  icon: string;
  items: { label: string; value?: string }[];
}) => (
  <div className="bg-white/5 p-6 rounded-xl border border-white/10 hover:border-[var(--blue-ciel)]/30 transition-all">
    <div className="flex items-center gap-3 mb-4 text-[var(--blue-ciel)]">
      <span className="text-2xl">{icon}</span>
      <h3 className="text-xl font-semibold text-white">{title}</h3>
    </div>
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <span className="text-white/60 flex-[0_0_120px]">{item.label}</span>
          <span className="text-white/90 flex-1 font-medium">
            {item.value || 'Non spécifié'}
          </span>
        </div>
      ))}
    </div>
  </div>
);

const Badge = ({ icon, value }: { icon: string; value: string }) => (
  <motion.div
    className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10"
    whileHover={{ y: -2 }}
  >
    <span>{icon}</span>
    <span className="text-white/90">{value}</span>
  </motion.div>
);
