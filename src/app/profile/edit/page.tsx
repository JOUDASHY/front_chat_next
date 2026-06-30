'use client';
import { useEffect, useState, useRef } from 'react';
import { User, Profile } from '@/types';
import api from '@/lib/axiosClient';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface UserProfile extends User {
  profile: Profile;
  first_name: string;
  last_name: string;
}

const GENDER_OPTIONS = [
  { value: 'M', label: 'Masculin' },
  { value: 'F', label: 'Féminin' },
  { value: 'O', label: 'Autre' },
];

const STATUS_OPTIONS = [
  { value: 'online', label: 'En ligne' },
  { value: 'offline', label: 'Hors ligne' },
  { value: 'away', label: 'Absent' },
  { value: 'busy', label: 'Occupé' },
  { value: 'invisible', label: 'Invisible' },
];

export default function EditProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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
    website: '',
    language_preference: '',
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
          website: data.profile.website || '',
          language_preference: data.profile.language_preference || '',
        });
      } catch {
        setError('Impossible de charger le profil');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const uploadImage = async (file: File, field: 'profile.image' | 'profile.cover_image', inputRef: React.RefObject<HTMLInputElement | null>) => {
    setIsUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append(field, file);
      await api.put('/api/chat/profile/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (inputRef.current) inputRef.current.value = '';
    } catch (err: any) {
      setError(err.response?.data?.message || 'Échec du téléchargement');
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const reader = new FileReader();
    reader.onloadend = () => setPreviewImage(reader.result as string);
    reader.readAsDataURL(file);
    uploadImage(file, 'profile.image', fileInputRef);
  };

  const handleCoverImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const reader = new FileReader();
    reader.onloadend = () => setPreviewCoverImage(reader.result as string);
    reader.readAsDataURL(file);
    uploadImage(file, 'profile.cover_image', coverImageRef);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('username', formData.username);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('first_name', formData.first_name);
      formDataToSend.append('last_name', formData.last_name);
      formDataToSend.append('profile.bio', formData.bio);
      formDataToSend.append('profile.lieu', formData.lieu);
      formDataToSend.append('profile.date_naiv', formData.date_naiv);
      if (formData.gender) formDataToSend.append('profile.gender', formData.gender);
      formDataToSend.append('profile.phone_number', formData.phone_number);
      if (formData.status) formDataToSend.append('profile.status', formData.status);
      formDataToSend.append('profile.passion', formData.passion);
      formDataToSend.append('profile.profession', formData.profession);
      formDataToSend.append('profile.website', formData.website);
      if (formData.language_preference) formDataToSend.append('profile.language_preference', formData.language_preference);

      if (coverImageRef.current?.files?.[0]) {
        formDataToSend.append('profile.cover_image', coverImageRef.current.files[0]);
      }
      if (fileInputRef.current?.files?.[0]) {
        formDataToSend.append('profile.image', fileInputRef.current.files[0]);
      }

      await api.put('/api/chat/profile/', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccessMsg('Profil mis à jour avec succès !');
      setTimeout(() => router.push('/profile'), 1200);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Échec de la mise à jour');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[var(--blue)] dark:border-indigo-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-red-400 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl">{error || 'Utilisateur introuvable'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header fixe */}
      <div className="fixed top-0 left-0 right-0 bg-[var(--blue)] dark:bg-gray-950 border-b border-gray-800 shadow-sm z-30 h-14 flex items-center px-4 gap-3">
        <button
          onClick={() => router.push('/profile')}
          className="p-2 hover:bg-[var(--blue-ciel)]/20 rounded-full transition-colors"
          aria-label="Retour"
        >
          <ArrowLeftIcon className="h-6 w-6 text-white" />
        </button>
        <h1 className="text-white font-bold text-lg">Modifier le profil</h1>
      </div>

      <div className="pt-14">
        {/* Bannière cover */}
        <div className="relative h-[220px] w-full overflow-hidden">
          <img
            src={
              previewCoverImage ||
              user.profile?.cover_image ||
              'https://jenmansafaris.com/wp-content/uploads/2023/12/Antsiranana-Diego-Suarez-Madagascar-Cities.jpg'
            }
            alt="Cover"
            className="w-full h-full object-cover"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.src =
                'https://jenmansafaris.com/wp-content/uploads/2023/12/Antsiranana-Diego-Suarez-Madagascar-Cities.jpg';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/40" />
          {isUploading && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <span className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}

          {/* Bouton modifier cover */}
          <button
            type="button"
            onClick={() => coverImageRef.current?.click()}
            className="absolute bottom-4 right-4 bg-[var(--blue)]/90 hover:bg-[var(--blue)] text-white px-4 py-2 rounded-lg shadow-lg transition-colors backdrop-blur-sm text-sm"
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

        {/* Avatar + nom */}
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-end gap-4 -mt-12 mb-6">
            <motion.div whileHover={{ scale: 1.05 }} className="relative shrink-0">
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-white dark:border-gray-800 shadow-xl overflow-hidden bg-white dark:bg-gray-700">
                <img
                  src={previewImage || user.profile?.image || '/default-avatar.svg'}
                  alt={user.username}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/default-avatar.svg';
                  }}
                />
                {isUploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-[var(--blue-ciel)] p-1.5 rounded-full shadow-md hover:opacity-80 transition-opacity"
                aria-label="Changer la photo"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            </motion.div>

            <div className="pb-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">JPEG ou PNG · max 2 MB</p>
              <p className="text-[var(--blue)] dark:text-gray-100 font-semibold text-lg">{user.username}</p>
            </div>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSave} className="space-y-6 pb-16">

            {/* Section identité */}
            <Section title="Connexion" icon="🔐">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Email" required hint="Utilisé pour vous connecter">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className={inputCls}
                  />
                </Field>
                <Field label="Identifiant (@pseudo)" required hint="Alternative à l'email pour la connexion">
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                    className={inputCls}
                  />
                </Field>
              </div>
            </Section>

            <Section title="Profil public" icon="👤">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Prénom" hint="Nom affiché dans le chat">
                  <input type="text" name="first_name" value={formData.first_name} onChange={handleInputChange} className={inputCls} />
                </Field>
                <Field label="Nom" hint="Nom affiché dans le chat">
                  <input type="text" name="last_name" value={formData.last_name} onChange={handleInputChange} className={inputCls} />
                </Field>
              </div>
            </Section>

            <Section title="Informations personnelles" icon="📌">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Lieu">
                  <input type="text" name="lieu" value={formData.lieu} onChange={handleInputChange} className={inputCls} />
                </Field>
                <Field label="Date de naissance">
                  <input type="date" name="date_naiv" value={formData.date_naiv} onChange={handleInputChange} className={inputCls} />
                </Field>
                <Field label="Genre">
                  <select name="gender" value={formData.gender} onChange={handleInputChange} className={inputCls}>
                    <option value="">Sélectionner</option>
                    {GENDER_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Téléphone">
                  <input type="text" name="phone_number" value={formData.phone_number} onChange={handleInputChange} className={inputCls} />
                </Field>
              </div>
            </Section>

            {/* Section statut */}
            <Section title="Statut" icon="💫">
              <Field label="Statut actuel">
                <select name="status" value={formData.status} onChange={handleInputChange} className={inputCls}>
                  <option value="">Sélectionner</option>
                  {STATUS_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
            </Section>

            {/* Section à propos */}
            <Section title="À propos" icon="📝">
              <Field label="Bio">
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  rows={3}
                  className={`${inputCls} resize-none`}
                />
              </Field>
              <Field label="Passions">
                <textarea
                  name="passion"
                  value={formData.passion}
                  onChange={handleInputChange}
                  rows={3}
                  className={`${inputCls} resize-none`}
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Profession">
                  <input type="text" name="profession" value={formData.profession} onChange={handleInputChange} className={inputCls} />
                </Field>
                <Field label="Site web">
                  <input type="text" name="website" value={formData.website} onChange={handleInputChange} className={inputCls} />
                </Field>
              </div>
            </Section>

            {/* Section Préférences */}
            <Section title="Préférences" icon="⚙️">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Langue de traduction par défaut" hint="Langue vers laquelle les messages seront traduits automatiquement">
                  <select name="language_preference" value={formData.language_preference} onChange={handleInputChange} className={inputCls}>
                    <option value="">Désactivé (Langue originale)</option>
  <option value="en">Anglais</option>
      <option value="fr">Français</option>
      <option value="es">Espagnol</option>
      <option value="mg">Malgache</option>
      <option value="de">Allemand</option>
      <option value="it">Italien</option>
      <option value="pt">Portugais</option>
      <option value="ru">Russe</option>
      <option value="zh">Chinois</option>
      <option value="ja">Japonais</option>
      <option value="ko">Coréen</option>
      <option value="ar">Arabe</option>
      <option value="hi">Hindi</option>
      <option value="tr">Turc</option>
      <option value="vi">Vietnamien</option>
      <option value="nl">Néerlandais</option>
      <option value="sw">Swahili</option>
      <option value="id">Indonésien</option>
      <option value="af">Afrikaans</option>
                  </select>
                </Field>
              </div>
            </Section>

            {/* Messages retour */}
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 text-red-600 dark:text-red-400 rounded-xl text-sm">
                ⚠️ {error}
              </div>
            )}
            {successMsg && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 text-green-600 dark:text-green-400 rounded-xl text-sm">
                ✅ {successMsg}
              </div>
            )}

            {/* Boutons flottants en bas */}
            <div className="sticky bottom-0 bg-gray-100/95 dark:bg-gray-900/95 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 -mx-4 sm:mx-0 sm:rounded-b-2xl px-4 sm:px-6 py-4 flex gap-3 justify-end">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/profile')}
                disabled={isSaving || isUploading}
                className="px-6 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
              >
                Annuler
              </motion.button>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isSaving || isUploading}
                className="px-6 py-2.5 rounded-xl bg-[var(--blue)] text-white hover:bg-[var(--blue-ciel)] transition-colors font-medium disabled:opacity-60 flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  '💾 Enregistrer'
                )}
              </motion.button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ─── Helpers ─── */

const inputCls =
  'w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--blue)] focus:border-transparent transition-all';

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <h2 className="text-[var(--blue)] dark:text-gray-100 font-semibold text-base">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {hint && <p className="text-xs text-gray-400 dark:text-gray-500">{hint}</p>}
      {children}
    </div>
  );
}
