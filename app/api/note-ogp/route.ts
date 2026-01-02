import { NextRequest, NextResponse } from 'next/server';

/**
 * noteの記事URLからOGP画像を取得するAPIエンドポイント
 * CORSを回避してサーバーサイドでOGP画像URLを取得
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const articleUrl = searchParams.get('url');

    if (!articleUrl) {
      return NextResponse.json(
        { error: 'URLパラメータが必要です' },
        { status: 400 }
      );
    }

    // URLがnote.comのものか確認
    if (!articleUrl.includes('note.com')) {
      return NextResponse.json(
        { error: '無効なURLです' },
        { status: 400 }
      );
    }

    // 記事ページをフェッチ
    const response = await fetch(articleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: '記事の取得に失敗しました' },
        { status: response.status }
      );
    }

    const html = await response.text();

    // OGP画像を抽出
    const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

    if (ogImageMatch && ogImageMatch[1]) {
      return NextResponse.json({
        success: true,
        ogImage: ogImageMatch[1],
      });
    }

    // twitter:imageも試行
    const twitterImageMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);

    if (twitterImageMatch && twitterImageMatch[1]) {
      return NextResponse.json({
        success: true,
        ogImage: twitterImageMatch[1],
      });
    }

    return NextResponse.json({
      success: false,
      error: 'OGP画像が見つかりませんでした',
    });
  } catch (error) {
    console.error('Note OGP取得エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

