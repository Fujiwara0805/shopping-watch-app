import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// 広告の視聴を記録
export async function POST(req: NextRequest) {
  try {
    const { adId, action } = await req.json();

    if (!adId || !action) {
      return NextResponse.json(
        { error: 'adIdとactionは必須です' },
        { status: 400 }
      );
    }

    if (action !== 'view' && action !== 'click') {
      return NextResponse.json(
        { error: 'actionは"view"または"click"である必要があります' },
        { status: 400 }
      );
    }

    // 広告の視聴/クリック数を更新
    const updateField = action === 'view' ? 'views_count' : 'clicks_count';
    
    // 現在の値を取得
    const { data: ad, error: fetchError } = await supabase
      .from('ads')
      .select(`${updateField}`)
      .eq('id', adId)
      .single();

    if (fetchError || !ad) {
      return NextResponse.json(
        { error: '広告が見つかりません' },
        { status: 404 }
      );
    }

    // カウントを増加
    const { error: updateError } = await supabase
      .from('ads')
      .update({
        [updateField]: ((ad as any)[updateField] || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', adId);

    if (updateError) {
      console.error('広告カウント更新エラー:', updateError);
      return NextResponse.json(
        { error: 'カウントの更新に失敗しました' },
        { status: 500 }
      );
    }

    // 広告視聴履歴を記録（ad_viewsテーブルが存在する場合）
    try {
      await supabase.from('ad_views').insert({
        ad_id: adId,
        action: action,
        viewed_at: new Date().toISOString(),
        clicked: action === 'click',
        clicked_at: action === 'click' ? new Date().toISOString() : null,
      });
    } catch (historyError) {
      // ad_viewsテーブルが存在しない場合は無視（オプショナル）
      console.warn('広告履歴の記録に失敗（テーブルが存在しない可能性）:', historyError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('広告トラッキングエラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}


