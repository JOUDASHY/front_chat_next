'use client';
import { useEffect, useState, useRef } from 'react';
import { User, Profile } from '@/types';
import api from '@/lib/axiosClient';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
interface UserProfile extends User {
  profile: Profile;
  first_name: string;
  last_name: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    lieu: '',
    date_naiv: '',
    status: '',
    passion: ''
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
          lieu: data.profile.lieu || '',
          date_naiv: data.profile.date_naiv || '',
          status: data.profile.status || '',
          passion: data.profile.passion || ''
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
        lieu: user.profile.lieu || '',
        date_naiv: user.profile.date_naiv || '',
        status: user.profile.status || '',
        passion: user.profile.passion || ''
      });
    }
    setPreviewImage(null);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setError('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
      formDataToSend.append('profile.lieu', formData.lieu);
      formDataToSend.append('profile.date_naiv', formData.date_naiv);
      formDataToSend.append('profile.status', formData.status);
      formDataToSend.append('profile.passion', formData.passion);
      
      // Ajouter l'image si elle a été modifiée
      if (fileInputRef.current?.files?.[0]) {
        formDataToSend.append('profile.image', fileInputRef.current.files[0]);
      }

      const { data } = await api.put('/api/chat/profile/', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Mettre à jour les données utilisateur avec la réponse
      setUser(data);
      setShowEditModal(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

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
    <div className="min-h-screen bg-gradient-to-br from-[var(--blue)] to-[var(--blue)]/90 relative overflow-hidden">
      {/* Éléments décoratifs animés */}
      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/dark-stripes.png')]" />
      
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-[var(--blue-ciel)]/20 rounded-full"
          initial={{
            scale: 0,
            x: Math.random() * 100 - 50,
            y: Math.random() * 100 - 50
          }}
          animate={{
            scale: [0, 1, 0],
            x: "100vw",
            rotate: 360
          }}
          transition={{
            duration: 10 + Math.random() * 10,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      ))}

      <div className="max-w-3xl mx-auto py-12 px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--light)]/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-[var(--blue-ciel)]/20 overflow-hidden"
        >
          {/* En-tête du profil */}
          <div className="relative bg-gradient-to-r from-[var(--blue)]/30 to-[var(--blue-ciel)]/20 p-8">
            <div className="flex flex-col items-center space-y-4">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="relative group"
              >
                <img
                  src={user.profile.image || '/default-avatar.png'}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover border-4 border-[var(--light)]/30 shadow-xl"
                />
                <div className="absolute inset-0 rounded-full border-4 border-transparent group-hover:border-[var(--jaune)]/30 transition-all" />
              </motion.div>
              
              <div className="text-center">
                <h1 className="text-4xl font-bold text-[var(--light)] drop-shadow-md">
                  {user.username}
                </h1>
                <p className="text-[var(--light)]/80 mt-1">{user.email}</p>
                {(user.first_name || user.last_name) && (
                  <p className="text-[var(--light)]/80 mt-2">
                    {user.first_name} {user.last_name}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Détails du profil */}
          <div className="p-8 space-y-6">
            <ProfileInfoItem 
              label="📍 Lieu" 
              value={user.profile.lieu || 'Non spécifié'}
              icon="🌍"
            />
            
            {user.profile.date_naiv && (
              <ProfileInfoItem
                label="🎂 Date de naissance"
                value={user.profile.date_naiv}
                icon="📅"
              />
            )}

            {user.profile.status && (
              <ProfileInfoItem
                label="💼 Statut"
                value={user.profile.status}
                icon="🌟"
              />
            )}

            <ProfileInfoItem
              label="📝 Bio"
              value={user.profile.passion || 'Aucune bio pour le moment'}
              icon="✏️"
              isBio
            />

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleOpenEditModal}
              className="w-full bg-gradient-to-r from-[var(--blue)] to-[var(--blue-ciel)] text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-[var(--blue-ciel)]/20 transition-all"
            >
              ✨ Modifier le profil
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* Modal d'édition */}
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
              className="bg-[var(--light)]/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-[var(--blue-ciel)]/20 max-w-md w-full"
            >
              {/* En-tête du modal */}
              <div className="flex justify-between items-center p-6 border-b border-[var(--blue)]/20">
                <h3 className="text-xl font-bold bg-gradient-to-r from-[var(--blue-ciel)] to-[var(--jaune)] bg-clip-text text-transparent">
                  Éditer le profil
                </h3>
                <button 
                  onClick={handleCloseEditModal}
                  className="p-2 hover:bg-[var(--blue)]/10 rounded-full transition-colors"
                >
                  <XMarkIcon className="h-6 w-6 text-[var(--light)]/80" />
                </button>
              </div>
              
              {/* Formulaire */}
              <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
                {/* Image de profil */}
                <div className="flex flex-col items-center space-y-3">
                  <div className="relative group">
                    <img
                      src={previewImage || user.profile.image || '/default-avatar.png'}
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover border-4 border-[var(--light)]/30 shadow-lg"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 bg-[var(--blue)] p-2 rounded-full shadow-md hover:bg-[var(--blue-ciel)] transition-colors"
                    >
                      <svg className="w-5 h-5 text-[var(--light)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <p className="text-sm text-center text-[var(--light)]/60">
                    Format JPEG ou PNG (max 2MB)
                  </p>
                </div>

                {/* Champs du formulaire */}
                <div className="space-y-4">
                  {[
                    { label: '👤 Nom d\'utilisateur', name: 'username', required: true },
                    { label: '📧 Email', name: 'email', type: 'email', required: true },
                    { label: '👨 Prénom', name: 'first_name' },
                    { label: '👩 Nom', name: 'last_name' },
                    { label: '📍 Lieu', name: 'lieu' },
                    { label: '🎂 Date de naissance', name: 'date_naiv', type: 'date' },
                    { label: '💼 Statut', name: 'status' },
                  ].map((field) => (
                    <div key={field.name}>
                      <label className="block text-[var(--light)]/80 mb-1.5">
                        {field.label}
                      </label>
                      <input
                        type={field.type || 'text'}
                        name={field.name}
                        value={formData[field.name as keyof typeof formData]}
                        onChange={handleInputChange}
                        className="w-full bg-[var(--light)]/5 border border-[var(--blue)]/20 rounded-lg px-4 py-2.5 text-[var(--light)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-ciel)] transition-all"
                        required={field.required}
                      />
                    </div>
                  ))}

                  <div>
                    <label className="block text-[var(--light)]/80 mb-1.5">
                      📝 Bio
                    </label>
                    <textarea
                      name="passion"
                      value={formData.passion}
                      onChange={handleInputChange}
                      className="w-full bg-[var(--light)]/5 border border-[var(--blue)]/20 rounded-lg px-4 py-2.5 text-[var(--light)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-ciel)] h-32 resize-none transition-all"
                    />
                  </div>
                </div>

                {/* Messages d'erreur */}
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg">
                    ⚠️ {error}
                  </div>
                )}

                {/* Boutons */}
                <div className="flex justify-end gap-3 pt-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    type="button"
                    onClick={handleCloseEditModal}
                    className="px-5 py-2.5 bg-[var(--blue)]/20 text-[var(--light)] rounded-lg hover:bg-[var(--blue)]/30 transition-colors"
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

const ProfileInfoItem = ({ label, value, icon, isBio = false }: { label: string; value: string; icon?: string; isBio?: boolean }) => (
  <div className="bg-[var(--light)]/5 p-4 rounded-xl border border-[var(--blue)]/20">
    <div className="flex items-center gap-2 text-[var(--light)]/80 mb-2">
      {icon && <span>{icon}</span>}
      <span className="font-medium">{label}</span>
    </div>
    <p className={`text-[var(--light)] ${isBio ? 'italic opacity-90' : 'font-semibold'}`}>
      {value}
    </p>
  </div>
);