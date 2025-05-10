'use client';
import { useEffect, useState, useRef } from 'react';
import { User, Profile } from '@/types';
import api from '@/lib/axiosClient';
import { XMarkIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface UserProfile extends User {
  profile: Profile;
  first_name: string;
  last_name: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverImageRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewCoverImage, setPreviewCoverImage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    bio: '',
    lieu: '',
    date_naiv: '',
    gender: '',
    phone_number: '',
    status: '',
    passion: '',
    profession: '',
    website: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get('/api/chat/me');
        setUser(data);
        setFormData({
          username: data.username,
          email: data.email,
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          bio: data.profile.bio || '',
          lieu: data.profile.lieu || '',
          date_naiv: data.profile.date_naiv || '',
          gender: data.profile.gender || '',
          phone_number: data.profile.phone_number || '',
          status: data.profile.status || '',
          passion: data.profile.passion || '',
          profession: data.profile.profession || '',
          website: data.profile.website || ''
        });
      } catch (err) {
        setError('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleOpenEditModal = () => {
    setShowEditModal(true);
    if (user) {
      setFormData({
        username: user.username,
        email: user.email,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        bio: user.profile.bio || '',
        lieu: user.profile.lieu || '',
        date_naiv: user.profile.date_naiv || '',
        gender: user.profile.gender || '',
        phone_number: user.profile.phone_number || '',
        status: user.profile.status || '',
        passion: user.profile.passion || '',
        profession: user.profile.profession || '',
        website: user.profile.website || ''
      });
    }
    setPreviewImage(null);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setError('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewCoverImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const GENDER_OPTIONS = [
    { value: 'M', label: 'Masculin' },
    { value: 'F', label: 'Féminin' },
    { value: 'O', label: 'Autre' }
  ];

  const STATUS_OPTIONS = [
    { value: 'online', label: 'En ligne' },
    { value: 'offline', label: 'Hors ligne' },
    { value: 'away', label: 'Absent' },
    { value: 'busy', label: 'Occupé' },
    { value: 'invisible', label: 'Invisible' }
  ];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    setError('');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('username', formData.username);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('first_name', formData.first_name);
      formDataToSend.append('last_name', formData.last_name);
      formDataToSend.append('profile.bio', formData.bio);
      formDataToSend.append('profile.lieu', formData.lieu);
      formDataToSend.append('profile.date_naiv', formData.date_naiv);

      if (formData.gender) {
        formDataToSend.append('profile.gender', formData.gender);
      }

      formDataToSend.append('profile.phone_number', formData.phone_number);

      if (formData.status) {
        formDataToSend.append('profile.status', formData.status);
      }

      formDataToSend.append('profile.passion', formData.passion);
      formDataToSend.append('profile.profession', formData.profession);
      formDataToSend.append('profile.website', formData.website);

      if (coverImageRef.current?.files?.[0]) {
        formDataToSend.append('profile.cover_image', coverImageRef.current.files[0]);
      }

      if (fileInputRef.current?.files?.[0]) {
        formDataToSend.append('profile.image', fileInputRef.current.files[0]);
      }

      const { data } = await api.put('/api/chat/profile/', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUser(data);
      setShowEditModal(false);
      setPreviewCoverImage(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
      console.error('Update error details:', err.response?.data);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    router.push('/chat');
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
        <p className="text-red-500 bg-gray-100 backdrop-blur-md p-6 rounded-xl shadow-xl">{error || 'User not found'}</p>
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
            <img
              src={previewCoverImage || user.profile?.cover_image || "https://jenmansafaris.com/wp-content/uploads/2023/12/Antsiranana-Diego-Suarez-Madagascar-Cities.jpg"}
              alt="Cover"
              className="w-full h-full object-cover"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (!img.src.includes('Antsiranana-Diego-Suarez-Madagascar-Cities.jpg')) {
                  img.src = "https://jenmansafaris.com/wp-content/uploads/2023/12/Antsiranana-Diego-Suarez-Madagascar-Cities.jpg";
                }
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/30" />
            
            {/* Bouton pour modifier l'image de couverture */}
            <button
              type="button"
              onClick={() => coverImageRef.current?.click()}
              className="absolute bottom-4 right-4 bg-[var(--blue)]/90 hover:bg-[var(--blue)] text-white px-4 py-2 rounded-lg shadow-lg transition-colors backdrop-blur-sm"
            >
              📸 Modifier la couverture
            </button>
            <input
              ref={coverImageRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleCoverImageUpload}
            />
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
                    const img = e.target as HTMLImageElement;
                    if (!img.src.includes('/default-avatar.png')) {
                      img.src = '/default-avatar.png';
                    }
                  }}
                />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Contenu principal */}
        <div className="max-w-[1200px] mx-auto px-4 mt-20 lg:mt-8">
          {/* En-tête avec nom et badges */}
          <div className="lg:ml-[200px] mb-8">
            <h1 className="text-3xl font-bold text-[var(--blue)]">{user.username}</h1>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge icon="✉️" value={user.email} />
              {user.first_name && <Badge icon="👤" value={user.first_name} />}
              {user.last_name && <Badge icon="👥" value={user.last_name} />}
            </div>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleOpenEditModal}
              className="mt-4 px-4 py-2 bg-[var(--blue)] text-white rounded-lg hover:bg-[var(--blue-ciel)] transition-colors"
            >
              ✨ Modifier le profil
            </motion.button>
          </div>

          {/* Grid pour les cartes d'information */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <ProfileCard
                title="Informations personnelles"
                icon="📌"
                items={[
                  { label: 'Lieu', value: user.profile?.lieu || undefined },
                  { label: 'Date de naissance', value: user.profile?.date_naiv ? new Date(user.profile.date_naiv).toLocaleDateString('fr-FR') : undefined },
                  { label: 'Genre', value: user.profile?.gender || undefined },
                  { label: 'Téléphone', value: user.profile?.phone_number || undefined }
                ]}
              />
              
              <ProfileCard
                title="Statut"
                icon="💫"
                items={[
                  { label: 'Statut actuel', value: user.profile?.status || undefined }
                ]}
              />
            </div>

            <div className="lg:col-span-2 space-y-6">
              <ProfileCard
                title="À propos"
                icon="📝"
                items={[
                  { label: 'Bio', value: user.profile?.bio || undefined },
                  { label: 'Passions', value: user.profile?.passion || undefined },
                  { label: 'Profession', value: user.profile?.profession || undefined },
                  { label: 'Site web', value: user.profile?.website || undefined }
                ]}
              />

              <ProfileCard
                title="Autres informations"
                icon="ℹ️"
                items={[
                  { label: 'Compte vérifié', value: user.profile?.is_verified ? 'Oui' : 'Non' },
                  { label: 'Dernière connexion', value: user.profile?.last_seen ? new Date(user.profile.last_seen).toLocaleString('fr-FR') : undefined }
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modal d'édition (inchangé) */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="relative bg-[var(--blue)] backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 max-w-md w-full"
            >
              <div className="flex justify-between items-center p-6 border-b border-white/10">
                <h3 className="text-xl font-bold text-[var(--jaune)]">
                  Éditer le profil
                </h3>
                <button
                  onClick={handleCloseEditModal}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <XMarkIcon className="h-6 w-6 text-white/80" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
                <div className="flex flex-col items-center space-y-3">
                  <div className="relative group">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white/30 shadow-lg">
                      <img
                        src={previewImage || user.profile?.image || '/default-avatar.png'}
                        alt="Profile"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          if (!img.src.includes('/default-avatar.png')) {
                            img.src = '/default-avatar.png';
                          }
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 bg-[var(--blue-ciel)] p-2 rounded-full shadow-md hover:bg-[var(--blue-ciel)]/80 transition-colors"
                    >
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </div>
                  <p className="text-sm text-center text-white/60">
                    Format JPEG ou PNG (max 2MB)
                  </p>
                </div>

                <div className="space-y-4">
                  {[
                    { label: '👤 Nom d\'utilisateur', name: 'username', required: true },
                    { label: '📧 Email', name: 'email', type: 'email', required: true },
                    { label: '👨 Prénom', name: 'first_name' },
                    { label: '👩 Nom', name: 'last_name' },
                    { label: '📍 Lieu', name: 'lieu' },
                    { label: '🎂 Date de naissance', name: 'date_naiv', type: 'date' },
                    { label: '♂♀ Genre', name: 'gender' },
                    { label: '📞 Numéro de téléphone', name: 'phone_number' },
                    { label: '💼 Statut', name: 'status' },
                  ].map((field) => (
                    <div key={field.name}>
                      <label className="block text-white/80 mb-1.5">
                        {field.label}
                      </label>
                      {field.name === 'gender' ? (
                        <select
                          name={field.name}
                          value={formData[field.name as keyof typeof formData]}
                          onChange={handleInputChange}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[var(--blue-ciel)] transition-all"
                        >
                          <option value="">Sélectionner un genre</option>
                          {GENDER_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : field.name === 'status' ? (
                        <select
                          name={field.name}
                          value={formData[field.name as keyof typeof formData]}
                          onChange={handleInputChange}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[var(--blue-ciel)] transition-all"
                        >
                          <option value="">Sélectionner un statut</option>
                          {STATUS_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type || 'text'}
                          name={field.name}
                          value={formData[field.name as keyof typeof formData]}
                          onChange={handleInputChange}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[var(--blue-ciel)] transition-all"
                          required={field.required}
                        />
                      )}
                    </div>
                  ))}

                  <div>
                    <label className="block text-white/80 mb-1.5">
                      📝 Bio
                    </label>
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleInputChange}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[var(--blue-ciel)] h-32 resize-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-white/80 mb-1.5">
                      🎨 Passions
                    </label>
                    <textarea
                      name="passion"
                      value={formData.passion}
                      onChange={handleInputChange}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[var(--blue-ciel)] h-32 resize-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-white/80 mb-1.5">
                      🏢 Profession
                    </label>
                    <input
                      type="text"
                      name="profession"
                      value={formData.profession}
                      onChange={handleInputChange}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[var(--blue-ciel)] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-white/80 mb-1.5">
                      🌐 Site web
                    </label>
                    <input
                      type="text"
                      name="website"
                      value={formData.website}
                      onChange={handleInputChange}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[var(--blue-ciel)] transition-all"
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg">
                    ⚠️ {error}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    type="button"
                    onClick={handleCloseEditModal}
                    className="px-5 py-2.5 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-colors"
                    disabled={isSaving}
                  >
                    Annuler
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r from-[var(--blue)] to-[var(--blue-ciel)] text-white rounded-lg font-medium disabled:opacity-50 transition-opacity"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-transparent border-t-white rounded-full animate-spin" />
                        Enregistrement...
                      </div>
                    ) : (
                      '💾 Enregistrer'
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
      {items.map((item, index) => (
        <div key={index} className="flex gap-2">
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
    <span className="text-white">{value}</span>
  </motion.div>
);
