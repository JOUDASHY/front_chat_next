'use client';

import { type ReactNode } from 'react';
import { CallProvider } from '@/context/CallContext';
import CallOverlay from '@/components/CallOverlay';

export default function AuthenticatedCallShell({ children }: { children: ReactNode }) {
  return (
    <CallProvider>
      {children}
      <CallOverlay />
    </CallProvider>
  );
}
