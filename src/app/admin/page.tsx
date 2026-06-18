'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  NoSymbolIcon,
  CheckCircleIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import api from '@/lib/axiosClient';

interface AdminUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  is_online: boolean;
  account_status: 'active' | 'suspended';
  profile_status: string;
  profile_image?: string | null;
  last_seen?: string | null;
  date_joined: string;
  last_login?: string | null;
}

interface AdminUsersResponse {
  count: number;
  results: AdminUser[];
}

const DEFAULT_AVATAR = '/default-avatar.svg';

function AdminUserAvatar({
  src,
  alt,
}: {
  src?: string | null;
  alt: string;
}) {
  const [imgSrc, setImgSrc] = useState(src?.trim() || DEFAULT_AVATAR);

  useEffect(() => {
    setImgSrc(src?.trim() || DEFAULT_AVATAR);
  }, [src]);

  return (
    <img
      src={imgSrc}
      alt={alt}
      className="h-full w-full object-cover"
      onError={() => setImgSrc(DEFAULT_AVATAR)}
    />
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [accountFilter, setAccountFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [onlineFilter, setOnlineFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [actionId, setActionId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data } = await api.get<{ id: number; is_staff?: boolean }>('/api/chat/me/');
        if (!data.is_staff) {
          router.replace('/chat');
          return;
        }
        setCurrentUserId(data.id);
      } catch {
        router.replace('/');
      }
    };
    void checkAccess();
  }, [router]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<AdminUsersResponse>('/api/admin/users/', {
        params: {
          ...(search.trim() ? { search: search.trim() } : {}),
          ...(accountFilter === 'active' ? { is_active: 'true' } : {}),
          ...(accountFilter === 'suspended' ? { is_active: 'false' } : {}),
          ...(onlineFilter === 'online' ? { online: 'true' } : {}),
          ...(onlineFilter === 'offline' ? { online: 'false' } : {}),
        },
      });
      setUsers(data.results);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 403) {
        router.replace('/chat');
        return;
      }
      setError('Impossible de charger les utilisateurs.');
    } finally {
      setLoading(false);
    }
  }, [accountFilter, onlineFilter, router, search]);

  useEffect(() => {
    if (currentUserId === null) return;
    const timer = setTimeout(() => {
      void fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [currentUserId, fetchUsers]);

  const handleSuspend = async (user: AdminUser) => {
    if (!window.confirm(`Suspendre le compte de ${user.display_name} ?`)) return;
    setActionId(user.id);
    try {
      const { data } = await api.post<{ user: AdminUser }>(`/api/admin/users/${user.id}/suspend/`);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? data.user : u)));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      alert(msg || 'Échec de la suspension.');
    } finally {
      setActionId(null);
    }
  };

  const handleUnsuspend = async (user: AdminUser) => {
    setActionId(user.id);
    try {
      const { data } = await api.post<{ user: AdminUser }>(`/api/admin/users/${user.id}/unsuspend/`);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? data.user : u)));
    } catch {
      alert('Échec de la réactivation.');
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (user: AdminUser) => {
    if (
      !window.confirm(
        `⚠️ Supprimer définitivement le compte de ${user.display_name} ?\n\nCette action est irréversible.`
      )
    )
      return;
    setDeleteId(user.id);
    try {
      await api.delete(`/api/admin/users/${user.id}/delete/`);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      alert(msg || 'Échec de la suppression.');
    } finally {
      setDeleteId(null);
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return '—';
    return new Date(value).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <header className="sticky top-0 z-20 bg-[var(--blue)] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.replace('/chat')}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Retour au chat"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="h-6 w-6 text-[var(--jaune)]" />
              <div>
                <h1 className="font-bold text-sm sm:text-base">Administration</h1>
                <p className="text-white/60 text-xs hidden sm:block">Gestion des comptes</p>
              </div>
            </div>
          </div>
          <span className="text-xs bg-white/10 px-3 py-1 rounded-full">
            {users.length} utilisateur{users.length > 1 ? 's' : ''}
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher nom, email, identifiant…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[var(--jaune)] outline-none text-sm"
            />
          </div>
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value as typeof accountFilter)}
            className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white"
          >
            <option value="all">Tous les comptes</option>
            <option value="active">Actifs</option>
            <option value="suspended">Suspendus</option>
          </select>
          <select
            value={onlineFilter}
            onChange={(e) => setOnlineFilter(e.target.value as typeof onlineFilter)}
            className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white"
          >
            <option value="all">Tous statuts ligne</option>
            <option value="online">En ligne</option>
            <option value="offline">Hors ligne</option>
          </select>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-gray-500 text-sm">Chargement…</div>
          ) : users.length === 0 ? (
            <div className="p-10 text-center text-gray-500 text-sm">Aucun utilisateur trouvé.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-500 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3">Utilisateur</th>
                    <th className="px-4 py-3">En ligne</th>
                    <th className="px-4 py-3">Compte</th>
                    <th className="px-4 py-3">Dernière connexion</th>
                    <th className="px-4 py-3">Inscription</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50/80">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-[220px]">
                          <div className="h-10 w-10 rounded-full overflow-hidden bg-[var(--blue)]/10 shrink-0">
                            <AdminUserAvatar
                              src={user.profile_image}
                              alt={user.display_name}
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{user.display_name}</p>
                            <p className="text-xs text-gray-500 truncate">@{user.username}</p>
                            <p className="text-xs text-gray-400 truncate">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            user.is_online
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              user.is_online ? 'bg-emerald-500' : 'bg-gray-400'
                            }`}
                          />
                          {user.is_online ? 'En ligne' : 'Hors ligne'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                            user.is_active
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {user.is_active ? 'Actif' : 'Suspendu'}
                        </span>
                        {user.is_staff && (
                          <span className="ml-1 inline-flex px-2 py-0.5 rounded-full text-[10px] bg-[var(--jaune)]/20 text-[var(--blue)] font-medium">
                            Admin
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {formatDate(user.last_login || user.last_seen)}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {formatDate(user.date_joined)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {user.id === currentUserId ? (
                          <span className="text-xs text-gray-400">Votre compte</span>
                        ) : (
                          <div className="inline-flex items-center gap-2">
                            {user.is_active ? (
                              <button
                                type="button"
                                disabled={actionId === user.id || deleteId === user.id}
                                onClick={() => void handleSuspend(user)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold disabled:opacity-50"
                              >
                                <NoSymbolIcon className="h-4 w-4" />
                                Suspendre
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={actionId === user.id || deleteId === user.id}
                                onClick={() => void handleUnsuspend(user)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold disabled:opacity-50"
                              >
                                <CheckCircleIcon className="h-4 w-4" />
                                Réactiver
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={deleteId === user.id || actionId === user.id}
                              onClick={() => void handleDelete(user)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-700 text-xs font-semibold disabled:opacity-50 transition-colors"
                              title="Supprimer définitivement"
                            >
                              <TrashIcon className="h-4 w-4" />
                              Supprimer
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
