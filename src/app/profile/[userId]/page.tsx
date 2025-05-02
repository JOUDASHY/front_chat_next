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

  const handleBack = () => {
    router.back();
  };

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
      <button
        onClick={handleBack}
        className="fixed top-4 left-4 z-20 bg-[var(--blue)] hover:bg-[var(--blue-ciel)] text-white p-2 rounded-full shadow-lg transition-colors"
        aria-label="Retour"
      >
        <ArrowLeftIcon className="h-6 w-6" />
      </button>

      <div className="max-w-5xl mx-auto py-12 px-4 relative z-10 min-h-screen flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-[var(--blue)] rounded-3xl shadow-2xl backdrop-blur-xl border border-white/10 overflow-hidden"
        >
          <div className="relative h-48 bg-[var(--blue-ciel)] overflow-hidden"></div>

          <div className="flex justify-center -mt-16 mb-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="relative group"
            >
              <div className="absolute inset-0 rounded-full bg-[var(--jaune)] blur-lg opacity-30 group-hover:opacity-50 transition-opacity" />
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/30 shadow-2xl relative z-10">
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

          <div className="pb-8 px-12 space-y-6">
            <div className="text-center">
              <motion.h1
                className="text-4xl font-bold text-[var(--light)]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {user.username}
              </motion.h1>

              <div className="mt-4 flex flex-wrap justify-center gap-4">
                <Badge icon="✉️" value={user.email} />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <ProfileCard
                title="Informations personnelles"
                icon="📌"
                items={[
                  { label: 'Lieu', value: user.profile.lieu },
                  { label: 'Date de naissance', value: user.profile.date_naiv ? new Date(user.profile.date_naiv).toLocaleDateString('fr-FR') : undefined },
                  { label: 'Statut', value: user.profile.status }
                ]}
              />

              <ProfileCard
                title="À propos"
                icon="📝"
                items={[
                  { label: 'Passions', value: user.profile.passion }
                ]}
              />
            </div>

            <div className="mt-8 flex justify-center gap-4">
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

const ProfileCard = ({ title, icon, items }: { title: string; icon: string; items: { label: string; value?: string }[] }) => (
  <div className="bg-white/5 p-6 rounded-xl border border-white/10 hover:border-[var(--blue-ciel)]/30 transition-all">
    <div className="flex items-center gap-3 mb-4 text-[var(--blue-ciel)]">
      <span className="text-2xl">{icon}</span>
      <h3 className="text-xl font-semibold text-white">{title}</h3>
    </div>
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="flex gap-2">
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
