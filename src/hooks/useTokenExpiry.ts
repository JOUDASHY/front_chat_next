'use client';

// hooks/useTokenExpiry.ts
// Surveille l'expiration du token JWT et tente un refresh automatique
// avant de déconnecter l'utilisateur. Ne déconnecte QUE si le refresh
// token est expiré ET qu'un appel refresh échoue côté serveur.

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/axiosClient';

/**
 * Décode le payload d'un JWT (base64) sans librairie externe.
 * Retourne null si le token est invalide.
 */
function decodeJwtExpiry(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof decoded.exp === 'number' ? decoded.exp : null;
  } catch {
    return null;
  }
}

/**
 * Retourne les millisecondes restantes avant expiration.
 * Valeur négative = déjà expiré.
 */
function msUntilExpiry(token: string): number {
  const exp = decodeJwtExpiry(token);
  if (exp === null) return -1;
  return exp * 1000 - Date.now();
}

function clearSession() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

/**
 * Tente de renouveler les tokens via /api/token/refresh/.
 * Retourne true si le refresh a réussi, false sinon.
 */
async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return false;

  try {
    const { data } = await api.post<{ access: string; refresh?: string }>(
      '/api/token/refresh/',
      { refresh: refreshToken }
    );
    localStorage.setItem('accessToken', data.access);
    if (data.refresh) {
      localStorage.setItem('refreshToken', data.refresh);
    }
    return true;
  } catch {
    return false;
  }
}

export function useTokenExpiry() {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const scheduleCheck = async () => {
      if (timerRef.current) clearTimeout(timerRef.current);

      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');

      // Pas de token du tout → déjà déconnecté
      if (!accessToken) {
        router.replace('/');
        return;
      }

      const accessMsLeft = msUntilExpiry(accessToken);

      // Si l'access token expire bientôt (< 5 min) ou est déjà expiré → tenter un refresh
      if (accessMsLeft < 5 * 60 * 1000) {
        const refreshed = await tryRefreshToken();
        if (refreshed) {
          // Refresh réussi → re-programmer le prochain check
          const newAccess = localStorage.getItem('accessToken');
          const newAccessMs = newAccess ? msUntilExpiry(newAccess) : 0;
          // Revérifier 5 minutes avant la prochaine expiration
          const nextCheck = Math.max(newAccessMs - 5 * 60 * 1000, 30_000);
          timerRef.current = setTimeout(scheduleCheck, nextCheck);
          return;
        }

        // Refresh échoué → pas de refreshToken ou serveur refuse
        if (!refreshToken || msUntilExpiry(refreshToken) <= 0) {
          clearSession();
          router.replace('/');
          return;
        }
      }

      // Access token encore valide → re-vérifier 5 min avant expiration
      const nextCheck = Math.max(accessMsLeft - 5 * 60 * 1000, 30_000);
      timerRef.current = setTimeout(scheduleCheck, nextCheck);
    };

    void scheduleCheck();

    // Réagir aux changements de localStorage (autre onglet qui se déconnecte)
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'accessToken' && !e.newValue) {
        clearSession();
        router.replace('/');
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener('storage', onStorage);
    };
  }, [router]);
}
