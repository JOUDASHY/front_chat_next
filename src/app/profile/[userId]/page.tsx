import UserProfileView from '@/components/UserProfileView';

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function Page({ params }: PageProps) {
  const { userId } = await params;
  return <UserProfileView userId={userId} />;
}

// Required for static generation
export async function generateStaticParams() {
  // Default paths to pre-render
  return [
    { userId: 'me' },
    { userId: 'profile' }
  ];
}
