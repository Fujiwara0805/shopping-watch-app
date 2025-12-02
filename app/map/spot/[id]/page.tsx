import { Metadata } from 'next';
import { supabase } from '@/lib/supabaseClient';
import { SpotDetailClient } from '@/components/spot/spot-detail-client';

interface PageProps {
  params: {
    id: string;
  };
}

// // 動的メタデータ生成（SSRで実行される）
// export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
//   // IDからmap_idとorderを抽出（形式: "mapId_order"）
//   const [mapId, orderStr] = params.id.split('_');
//   const order = parseInt(orderStr || '0');

//   // mapsテーブルから該当するマップを取得
//   const { data: mapData } = await supabase
//     .from('maps')
//     .select('*')
//     .eq('id', mapId)
//     .eq('is_deleted', false)
//     .single();

//   if (!mapData || !mapData.locations || mapData.locations.length <= order) {
//     return {
//       title: '場所が見つかりません - トクドク',
//       description: '指定された場所が見つかりませんでした。',
//       robots: {
//         index: false,
//         follow: false,
//       },
//     };
//   }

//   // locations配列から該当する場所を取得
//   const location = mapData.locations[order];
//   const spotName = location.store_name || '場所';
//   const mapTitle = mapData.title || 'マップ';
  
//   // 説明文を生成（最大160文字）
//   let description = `${spotName}の詳細情報。${mapTitle}に掲載されています。`;
//   if (location.content) {
//     description += ` ${location.content.substring(0, 80)}`;
//   }
//   if (description.length > 160) {
//     description = description.substring(0, 157) + '...';
//   }
  
//   // 画像URLの処理
//   let imageUrl = 'https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png';
//   if (location.image_urls && Array.isArray(location.image_urls) && location.image_urls.length > 0) {
//     imageUrl = location.image_urls[0];
//   }

//   // キーワード生成
//   const keywords = [
//     spotName,
//     mapTitle,
//     mapData.category,
//     'トクドク',
//     'マップ',
//     '観光',
//     'グルメ',
//   ].filter(Boolean);

//   const canonicalUrl = `https://tokudoku.com/map/spot/${params.id}`;

//   return {
//     title: `${spotName} - ${mapTitle} | トクドク`,
//     description,
//     keywords: keywords.join(', '),
//     openGraph: {
//       title: `${spotName} - ${mapTitle}`,
//       description,
//       images: [
//         {
//           url: imageUrl,
//           width: 1200,
//           height: 630,
//           alt: spotName,
//         },
//       ],
//       type: 'website',
//       locale: 'ja_JP',
//       siteName: 'トクドク',
//       url: canonicalUrl,
//     },
//     twitter: {
//       card: 'summary_large_image',
//       title: `${spotName} - ${mapTitle}`,
//       description,
//       images: [imageUrl],
//       site: '@tokudoku',
//       creator: '@tokudoku',
//     },
//     alternates: {
//       canonical: canonicalUrl,
//     },
//     robots: {
//       index: true,
//       follow: true,
//       googleBot: {
//         index: true,
//         follow: true,
//         'max-image-preview': 'large',
//         'max-snippet': -1,
//       },
//     },
//   };
// }

// ページコンポーネント
export default async function SpotDetailPage({ params }: PageProps) {
  return (
    <>
      {/* クライアントコンポーネント */}
      <SpotDetailClient spotId={params.id} />
    </>
  );
}

