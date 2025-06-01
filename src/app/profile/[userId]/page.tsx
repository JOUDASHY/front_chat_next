import UserProfileView from '@/components/UserProfileView';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ userId: string }>;  // Next.js attend une Promise ici
}

export default async function Page({ params }: PageProps) {
  const resolvedParams = await params;  // On attend la résolution de la Promise
  return <UserProfileView userId={resolvedParams.userId} />;
}
