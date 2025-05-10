'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PasswordResetForm from './PasswordResetForm';

export default function ClientPasswordReset({ uid, token }: { uid: string; token: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (uid === 'default' || token === 'default') {
      window.location.href = '/emailreset';
      return;
    }
    setIsLoading(false);
  }, [uid, token]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return <PasswordResetForm uid={uid} token={token} />;
}
