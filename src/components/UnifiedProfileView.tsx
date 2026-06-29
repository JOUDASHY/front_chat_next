'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import api from '@/lib/axiosClient';
import {
  ArrowLeftIcon, PencilSquareIcon, ChatBubbleLeftRightIcon,
  MapPinIcon, CalendarDaysIcon, PhoneIcon, GlobeAltIcon,
  BriefcaseIcon, HeartIcon, ClockIcon, SparklesIcon,
  UserIcon, EnvelopeIcon,
} from '@heroicons/react/24/outline';
import { CheckBadgeIcon as CheckBadgeSolid } from '@heroicons/react/24/solid';

interface Profile {
  image: string | null;
  cover_image?: string;
  bio: string | null;
  lieu: string | null;
  date_naiv: string | null;
  gender: string | null;
  phone_number: string | null;
  status: string | null;
  passion: string | null;
  profession: string | null;
  website: string | null;
  last_seen: string | null;
  is_verified: boolean;
  theme_preference: string | null;
  language_preference: string | null;
  age: number | null;
  created_at: string;
  updated_at: string;
}

interface UserData {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  profile: Profile;
}

interface Props {
  /** true = own profile (/profile), false = other user (/profile/[id]) */
  isSelf: boolean;
  /** undefined when isSelf=true (fetches /me), string id when viewing other */
  userId?: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; dot: string }> = {
  online:    { label: 'En ligne',   color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', dot: 'bg-emerald-500' },
  offline:   { label: 'Hors ligne', color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',       dot: 'bg-gray-400'    },
  away:      { label: 'Absent',     color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',     dot: 'bg-amber-400'   },
  busy:      { label: 'Occupé',     color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',         dot: 'bg-red-500'     },
  invisible: { label: 'Invisible',  color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',   dot: 'bg-purple-400'  },
};

function fmt(d?: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}
function fmtDT(d?: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function Skeleton() {
  return (
    <div className="min-h-screen bg-[#f0f2f5] dark:bg-gray-900 animate-pulse">
      <div className="h-[300px] bg-gray-300 dark:bg-gray-800 w-full" />
      <div className="max-w-5xl mx-auto px-4 mt-4">
        <div className="w-32 h-32 rounded-full bg-gray-300 dark:bg-gray-700 border-4 border-white dark:border-gray-900" />
        <div className="mt-4 h-7 w-48 bg-gray-300 dark:bg-gray-700 rounded-lg" />
        <div className="mt-2 h-4 w-64 bg-gray-200 dark:bg-gray-800 rounded-lg" />
      </div>
    </div>
  );
}

export default function UnifiedProfileView({ isSelf, userId }: Props) {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'about' | 'info'>('about');
  const [imgLoaded, setImgLoaded] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const goToChat = () => router.replace('/chat');

  useEffect(() => {
    const url = isSelf ? '/api/chat/me' : `/api/chat/users/${userId}`;
    api.get(url)
      .then(({ data }) => setUser(data))
      .catch(() => setError('Impossible de charger le profil'))
      .finally(() => setIsLoading(false));
  }, [isSelf, userId]);

  const handleStartConversation = async () => {
    if (!user) return;
    router.replace(`/chat?userId=${user.id}`);
  };

  if (isLoading) return <Skeleton />;

  if (!user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#f0f2f5] dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl text-center space-y-3">
          <p className="text-red-500 font-medium">{error || 'Utilisateur introuvable'}</p>
          <button onClick={goToChat} className="text-[var(--blue)] dark:text-blue-400 underline text-sm">Retour</button>
        </div>
      </div>
    );
  }

  const status = STATUS_MAP[user.profile?.status || 'offline'];
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
  const memberSince = user.profile?.created_at
    ? new Date(user.profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : null;
  const DEFAULT_COVER = 'https://jenmansafaris.com/wp-content/uploads/2023/12/Antsiranana-Diego-Suarez-Madagascar-Cities.jpg';

  return (
    <div className="min-h-screen bg-[#f0f2f5] dark:bg-gray-900">
      {/* Topbar */}
      <div className="fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-4
                      bg-[var(--blue)]/95 backdrop-blur-md shadow-lg">
        <button onClick={goToChat}
          className="flex items-center gap-2 text-white/80 hover:text-white transition-colors group">
          <span className="p-1.5 rounded-full group-hover:bg-white/10 transition-colors">
            <ArrowLeftIcon className="h-5 w-5" />
          </span>
          <span className="text-sm font-medium hidden sm:block">Retour</span>
        </button>

        <span className="text-white font-semibold text-sm tracking-wide">
          {isSelf ? 'Mon Profil' : `Profil de ${user.username}`}
        </span>

        {isSelf ? (
          <button onClick={() => router.push('/profile/edit')}
            className="flex items-center gap-1.5 bg-[var(--jaune)] hover:bg-[var(--jaune)]/90
                       text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-all
                       shadow-md hover:scale-105 active:scale-95">
            <PencilSquareIcon className="h-3.5 w-3.5" />
            Modifier
          </button>
        ) : (
          <button onClick={handleStartConversation}
            className="flex items-center gap-1.5 bg-[var(--jaune)] hover:bg-[var(--jaune)]/90
                       text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-all
                       shadow-md hover:scale-105 active:scale-95">
            <ChatBubbleLeftRightIcon className="h-3.5 w-3.5" />
            Message
          </button>
        )}
      </div>

      <div className="pt-14">
        {/* Cover */}
        <div className="relative h-[280px] sm:h-[360px] w-full overflow-hidden">
          <motion.img
            initial={{ scale: 1.05, opacity: 0 }}
            animate={{ scale: 1, opacity: imgLoaded ? 1 : 0 }}
            transition={{ duration: 0.6 }}
            src={user.profile?.cover_image || DEFAULT_COVER}
            alt="Couverture"
            className="w-full h-full object-cover"
            onLoad={() => setImgLoaded(true)}
            onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_COVER; setImgLoaded(true); }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
        </div>

        <div className="max-w-5xl mx-auto px-4">
          {/* Avatar flottant */}
          <div className="flex justify-start -mt-14 sm:-mt-18 pl-2 sm:pl-6 relative z-10">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
              className="relative shrink-0">
              <div className="w-32 h-32 sm:w-48 sm:h-48 rounded-full border-[5px] border-white dark:border-gray-900
                              shadow-2xl overflow-hidden bg-white dark:bg-gray-800 ring-2 ring-[var(--blue-ciel)]/30">
                <img src={user.profile?.image || '/default-avatar.svg'} alt={user.username}
                  className="w-full h-full object-cover cursor-zoom-in hover:scale-105 transition-transform duration-300"
                  onClick={() => setIsFullScreen(true)}
                  onError={(e) => { (e.target as HTMLImageElement).src = '/default-avatar.svg'; }} />
              </div>
              <span className={`absolute bottom-2 right-2 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-white shadow-md ${status.dot}`} />
            </motion.div>
          </div>

          {/* Card identité */}
          <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm px-5 pt-4 pb-5 mt-3">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--blue)] dark:text-gray-100 leading-tight">
                  {fullName || user.username}
                </h1>
                {fullName && <p className="text-gray-400 text-sm mt-0.5">@{user.username}</p>}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${status.color}`}>
                    <span className={`w-2 h-2 rounded-full ${status.dot}`} />
                    {status.label}
                  </span>
                  {user.profile?.is_verified && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-600">
                      <CheckBadgeSolid className="h-3.5 w-3.5 text-blue-500" />
                      Vérifié
                    </span>
                  )}
                  {memberSince && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <ClockIcon className="h-3.5 w-3.5" />
                      Membre depuis {memberSince}
                    </span>
                  )}
                </div>
              </div>
              {/* Boutons selon isSelf */}
              <div className="flex items-center gap-2 shrink-0">
                {isSelf ? (
                  <>
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => router.push('/chat')}
                      className="flex items-center gap-1.5 bg-[var(--blue)] text-white text-sm
                                 font-semibold px-4 py-2 rounded-xl hover:bg-[var(--blue-ciel)] transition-all shadow-sm">
                      <ChatBubbleLeftRightIcon className="h-4 w-4" />
                      Messages
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => router.push('/profile/edit')}
                      className="flex items-center gap-1.5 border-2 border-[var(--blue)] text-[var(--blue)]
                                 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[var(--blue)] hover:text-white transition-all">
                      <PencilSquareIcon className="h-4 w-4" />
                      Modifier
                    </motion.button>
                  </>
                ) : (
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={handleStartConversation}
                    className="flex items-center gap-1.5 bg-[var(--blue)] text-white text-sm
                               font-semibold px-4 py-2 rounded-xl hover:bg-[var(--blue-ciel)] transition-all shadow-sm">
                    <ChatBubbleLeftRightIcon className="h-4 w-4" />
                    Envoyer un message
                  </motion.button>
                )}
              </div>
            </div>
            {user.profile?.bio && (
              <p className="mt-3 text-gray-600 dark:text-gray-300 text-sm leading-relaxed border-t border-[#f3f4f6] dark:border-[#374151] pt-3">
                {user.profile.bio}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
              {user.profile?.lieu && <QuickInfo icon={<MapPinIcon className="h-3.5 w-3.5" />} value={user.profile.lieu} />}
              {user.profile?.profession && <QuickInfo icon={<BriefcaseIcon className="h-3.5 w-3.5" />} value={user.profile.profession} />}
              {user.email && <QuickInfo icon={<EnvelopeIcon className="h-3.5 w-3.5" />} value={user.email} />}
              {user.profile?.website && <QuickInfo icon={<GlobeAltIcon className="h-3.5 w-3.5" />} value={user.profile.website} link={user.profile.website} />}
            </div>
          </motion.div>

          {/* Tabs */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="flex gap-1 mt-5 bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-1.5">
            {(['about', 'info'] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all
                  ${activeTab === tab ? 'bg-[var(--blue)] text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                {tab === 'about' ? '📝 À propos' : 'ℹ️ Informations'}
              </button>
            ))}
          </motion.div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            <motion.div key={activeTab}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
              className="mt-4 pb-10">
              {activeTab === 'about' ? <AboutTab user={user} /> : <InfoTab user={user} isSelf={isSelf} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Full screen image modal */}
      <AnimatePresence>
        {isFullScreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsFullScreen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 cursor-zoom-out"
          >
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              src={user.profile?.image || '/default-avatar.svg'}
              alt={user.username}
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()} 
            />
            <button
              onClick={() => setIsFullScreen(false)}
              className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              aria-label="Fermer"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── About Tab ─── */
function AboutTab({ user }: { user: UserData }) {
  const { profile } = user;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="space-y-4">
        <GlassCard>
          <CardHeader icon={<UserIcon className="h-5 w-5" />} title="Profil" />
          <div className="space-y-3 mt-3">
            <InfoRow icon={<EnvelopeIcon className="h-4 w-4 text-[var(--blue-ciel)]" />} label="Email" value={user.email} />
            {user.first_name && <InfoRow icon={<UserIcon className="h-4 w-4 text-[var(--blue-ciel)]" />} label="Prénom" value={user.first_name} />}
            {user.last_name && <InfoRow icon={<UserIcon className="h-4 w-4 text-[var(--blue-ciel)]" />} label="Nom" value={user.last_name} />}
            {profile?.lieu && <InfoRow icon={<MapPinIcon className="h-4 w-4 text-[var(--jaune)]" />} label="Lieu" value={profile.lieu} />}
            {profile?.phone_number && <InfoRow icon={<PhoneIcon className="h-4 w-4 text-emerald-500" />} label="Téléphone" value={profile.phone_number} />}
            {profile?.date_naiv && <InfoRow icon={<CalendarDaysIcon className="h-4 w-4 text-pink-400" />} label="Naissance" value={fmt(profile.date_naiv) || ''} />}
            {profile?.gender && (
              <InfoRow icon={<SparklesIcon className="h-4 w-4 text-purple-400" />} label="Genre"
                value={({ M: 'Masculin', F: 'Féminin', O: 'Autre' } as Record<string,string>)[profile.gender] || profile.gender} />
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <CardHeader icon={<SparklesIcon className="h-5 w-5" />} title="Disponibilité" />
          {profile?.status ? (() => {
            const s = STATUS_MAP[profile.status] || STATUS_MAP.offline;
            return (
              <div className={`mt-3 flex items-center gap-2 px-4 py-3 rounded-xl ${s.color}`}>
                <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
                <span className="font-semibold text-sm">{s.label}</span>
              </div>
            );
          })() : <EmptyState text="Aucun statut défini" />}
        </GlassCard>
      </div>

      <div className="lg:col-span-2 space-y-4">
        <GlassCard>
          <CardHeader icon={<PencilSquareIcon className="h-5 w-5" />} title="Bio" />
          {profile?.bio
            ? <p className="mt-3 text-gray-700 dark:text-gray-300 leading-relaxed text-[15px]">{profile.bio}</p>
            : <EmptyState text="Aucune bio renseignée" />}
        </GlassCard>

        {profile?.passion && (
          <GlassCard>
            <CardHeader icon={<HeartIcon className="h-5 w-5" />} title="Passions & Centres d'intérêt" />
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.passion.split(/[,\n]+/).map((p, i) => {
                const t = p.trim();
                return t ? (
                  <motion.span key={i} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="px-3 py-1.5 bg-gradient-to-r from-[var(--blue)] to-[#001566]
                               text-white text-xs font-semibold rounded-full shadow-sm
                               hover:from-[var(--blue-ciel)] hover:to-[var(--blue)] transition-all cursor-default">
                    {t}
                  </motion.span>
                ) : null;
              })}
            </div>
          </GlassCard>
        )}

        {(profile?.profession || profile?.website) && (
          <GlassCard>
            <CardHeader icon={<BriefcaseIcon className="h-5 w-5" />} title="Professionnel" />
            <div className="mt-3 space-y-3">
              {profile.profession && <InfoRow icon={<BriefcaseIcon className="h-4 w-4 text-[var(--jaune)]" />} label="Profession" value={profile.profession} />}
              {profile.website && <InfoRow icon={<GlobeAltIcon className="h-4 w-4 text-[var(--blue-ciel)]" />} label="Site web" value={profile.website} link={profile.website} />}
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}

/* ─── Info Tab ─── */
function InfoTab({ user, isSelf }: { user: UserData; isSelf: boolean }) {
  const { profile } = user;
  const items = [
    { icon: <CheckBadgeSolid className="h-5 w-5 text-blue-500" />, label: 'Compte vérifié', value: profile?.is_verified ? 'Oui ✅' : 'Non', highlight: profile?.is_verified },
    { icon: <ClockIcon className="h-5 w-5 text-gray-400" />, label: 'Dernière connexion', value: fmtDT(profile?.last_seen) || 'Inconnue' },
    { icon: <CalendarDaysIcon className="h-5 w-5 text-purple-400" />, label: 'Membre depuis', value: fmt(profile?.created_at) || '—' },
    ...(isSelf ? [{ icon: <ClockIcon className="h-5 w-5 text-gray-400" />, label: 'Profil mis à jour', value: fmtDT(profile?.updated_at) || '—' }] : []),
    { icon: <SparklesIcon className="h-5 w-5 text-amber-400" />, label: 'Thème préféré', value: profile?.theme_preference || 'Non défini' },
    { icon: <GlobeAltIcon className="h-5 w-5 text-[var(--blue-ciel)]" />, label: 'Langue préférée', value: profile?.language_preference || 'Non défini' },
    { icon: <UserIcon className="h-5 w-5 text-pink-400" />, label: 'Âge', value: profile?.age ? `${profile.age} ans` : 'Non renseigné' },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
          <GlassCard>
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-xl ${item.highlight ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-gray-50 dark:bg-gray-700'}`}>{item.icon}</div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400 font-medium">{item.label}</p>
                <p className={`text-sm font-bold mt-0.5 truncate ${item.highlight ? 'text-blue-600 dark:text-blue-400' : 'text-[var(--blue)] dark:text-gray-100'}`}>
                  {item.value}
                </p>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      ))}
    </div>
  );
}

/* ─── UI helpers ─── */
function GlassCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-[#f3f4f6] dark:border-[#374151] p-5 hover:shadow-md transition-shadow duration-200">
      {children}
    </div>
  );
}
function CardHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="p-1.5 bg-[var(--blue)]/10 dark:bg-gray-700 rounded-lg text-[var(--blue)] dark:text-gray-200">{icon}</div>
      <h3 className="font-bold text-[var(--blue)] dark:text-gray-100 text-base">{title}</h3>
    </div>
  );
}
function InfoRow({ icon, label, value, link }: { icon: React.ReactNode; label: string; value: string; link?: string }) {
  return (
    <div className="flex items-center gap-3 group">
      <div className="shrink-0 w-8 h-8 flex items-center justify-center bg-gray-50 dark:bg-gray-700 group-hover:bg-[var(--blue)]/5 dark:group-hover:bg-gray-600 rounded-xl transition-colors">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide leading-none mb-0.5">{label}</p>
        {link ? (
          <a href={link.startsWith('http') ? link : `https://${link}`} target="_blank" rel="noopener noreferrer"
            className="text-sm font-semibold text-[var(--blue-ciel)] hover:underline truncate block">{value}</a>
        ) : (
          <p className="text-sm font-semibold text-[var(--blue)] dark:text-gray-100 truncate">{value}</p>
        )}
      </div>
    </div>
  );
}
function QuickInfo({ icon, value, link }: { icon: React.ReactNode; value: string; link?: string }) {
  const cls = 'flex items-center gap-1 text-xs text-gray-500 hover:text-[var(--blue)] transition-colors';
  return link ? (
    <a href={link.startsWith('http') ? link : `https://${link}`} target="_blank" rel="noopener noreferrer" className={cls}>
      {icon}<span className="truncate max-w-[140px]">{value}</span>
    </a>
  ) : (
    <span className={cls}>{icon}<span className="truncate max-w-[140px]">{value}</span></span>
  );
}
function EmptyState({ text }: { text: string }) {
  return <p className="mt-3 text-sm text-gray-400 italic text-center py-3">{text}</p>;
}
