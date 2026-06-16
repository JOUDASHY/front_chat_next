import UnifiedProfileView from '@/components/UnifiedProfileView';

export const dynamic = 'force-dynamic';

export default function ProfilePage() {
  return <UnifiedProfileView isSelf={true} />;
}
