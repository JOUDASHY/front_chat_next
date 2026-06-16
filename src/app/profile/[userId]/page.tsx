import UnifiedProfileView from '@/components/UnifiedProfileView';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function Page({ params }: PageProps) {
  const { userId } = await params;
  return <UnifiedProfileView isSelf={false} userId={userId} />;
}
