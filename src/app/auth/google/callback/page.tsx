'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function GoogleCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1) Récupérer le code depuis l'URL
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (!code) {
      setError('Code d’authentification manquant.');
      return;
    }

    // 2) Appeler votre API Django pour échanger le code contre un token
    (async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/google/callback/?code=${code}`
        );
        const data = await res.json();

        if (!res.ok || !data.access_token) {
          throw new Error(data.error || 'Échec de la récupération du token');
        }

        // 3) Stocker les tokens et infos user
        localStorage.setItem('accessToken', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));

        // 4) Rediriger vers la page protégée
        router.replace('/chat');
      } catch (err: any) {
        console.error('Erreur Google Callback:', err);
        setError('Impossible de finaliser la connexion Google.');
      }
    })();
  }, [router]);

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>
        <h2>Erreur d’authentification</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2>Connexion en cours…</h2>
      <p>Merci de patienter, vous êtes presque connecté.</p>
    </div>
  );
}
