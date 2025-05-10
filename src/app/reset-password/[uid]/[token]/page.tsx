import ClientPasswordReset from '@/components/ClientPasswordReset';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{
    uid: string;
    token: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  if (!params) {
    notFound();
  }

  const resolvedParams = await params;
  return <ClientPasswordReset uid={resolvedParams.uid} token={resolvedParams.token} />;
}

// Generate all required static paths
export function generateStaticParams() {
  return [
    { uid: 'NQ', token: 'cpl632-3257ae2b11da1457e6d85dcba39ba2f7' },
    { uid: 'default', token: 'default' }
  ];
}
