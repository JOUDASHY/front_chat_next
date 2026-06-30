'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export function useNavigationProgress() {
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();

  const navigate = useCallback((url: string) => {
    setIsNavigating(true);
    router.push(url);
  }, [router]);

  // Timeout de sécurité
  useEffect(() => {
    if (!isNavigating) return;
    const t = setTimeout(() => setIsNavigating(false), 8000);
    return () => clearTimeout(t);
  }, [isNavigating]);

  return { isNavigating, navigate, setIsNavigating };
}

export default function NavigationBar({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-[200] h-1 bg-[var(--blue)]/20">
      <div className="h-full bg-[var(--jaune)] rounded-full animate-progress" />
    </div>
  );
}
