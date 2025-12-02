import { Metadata } from 'next';
import { supabase } from '@/lib/supabaseClient';
import { SpotDetailClient } from '@/components/spot/spot-detail-client';

interface PageProps {
  params: {
    id: string;
  };
}


// ページコンポーネント
export default async function SpotDetailPage({ params }: PageProps) {
  return (
    <>
      {/* クライアントコンポーネント */}
      <SpotDetailClient spotId={params.id} />
    </>
  );
}

