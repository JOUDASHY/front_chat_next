'use client';

// hooks/useTokenExpiry.ts
// Surveille l'expiration du token JWT et déconnecte automatiquement l'user
// quand le refresh token est aussi expiré (session terminée).

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

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

export function useTokenExpiry() {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const scheduleCheck = () => {
      if (timerRef.current) clearTimeout(timerRef.current);

      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');

      // Pas de token du tout → déjà déconnecté
      if (!accessToken) {
        router.replace('/');
        return;
      }

      const accessMsLeft = msUntilExpiry(accessToken);

      // Cas Google OAuth : pas de refreshToken mais accessToken encore valide
      // On ne déconnecte pas — axios retentera si 401
      if (!refreshToken) {
        if (accessMsLeft <= 0) {
          // Access token expiré et pas de refresh → déconnexion
          clearSession();
          router.replace('/');
        } else {
          // Re-vérifier à l'expiration de l'access token
          timerRef.current = setTimeout(scheduleCheck, accessMsLeft + 1000);
        }
        return;
      }

      const refreshMsLeft = msUntilExpiry(refreshToken);

      // Le refresh token est expiré → session terminée
      if (refreshMsLeft <= 0) {
        clearSession();
        router.replace('/');
        return;
      }

      // Programmer un check au moment où le refresh token expire
      const checkIn = Math.max(refreshMsLeft + 1000, 5000);
      timerRef.current = setTimeout(scheduleCheck, checkIn);
    };

    scheduleCheck();

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
