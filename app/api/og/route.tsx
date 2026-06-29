/**
 * 動的OGP画像生成API
 * Next.jsのImageResponseを使用して動的にOG画像を生成
 * AI検索エンジンが視覚的コンテンツを理解するのに役立つ
 */

import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // URLパラメータから情報を取得
    const title = searchParams.get('title') || 'TALE';
    const subtitle = searchParams.get('subtitle') || '地域イベント発見アプリ';
    const eventName = searchParams.get('event');
    const location = searchParams.get('location');
    const date = searchParams.get('date');

    return new ImageResponse(
      (
        <div
          style={{
            background: 'linear-gradient(135deg, #fef3e7 0%, #fff5eb 100%)',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px',
            fontFamily: 'system-ui, sans-serif',
            position: 'relative',
          }}
        >
          {/* 背景装飾 */}
          <div
            style={{
              position: 'absolute',
              top: '0',
              left: '0',
              width: '100%',
              height: '100%',
              opacity: 0.1,
              background: `
                radial-gradient(circle at 20% 30%, #ff6b6b 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, #ffd93d 0%, transparent 50%),
                radial-gradient(circle at 40% 70%, #6bcf7f 0%, transparent 50%),
                radial-gradient(circle at 90% 80%, #4d96ff 0%, transparent 50%)
              `,
            }}
          />

          {/* ロゴ */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '40px',
            }}
          >
            <div
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '30px',
                background: '#73370c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '60px',
                color: 'white',
                fontWeight: 'bold',
                marginRight: '20px',
              }}
            >
              🎪
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  fontSize: '72px',
                  fontWeight: 'bold',
                  color: '#73370c',
                  lineHeight: 1,
                }}
              >
                {title}
              </div>
              <div
                style={{
                  fontSize: '36px',
                  color: '#8b4513',
                  marginTop: '10px',
                }}
              >
                {subtitle}
              </div>
            </div>
          </div>

          {/* イベント情報（もし指定されている場合） */}
          {eventName && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'white',
                padding: '40px 60px',
                borderRadius: '30px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                marginTop: '40px',
                maxWidth: '900px',
              }}
            >
              <div
                style={{
                  fontSize: '48px',
                  fontWeight: 'bold',
                  color: '#73370c',
                  marginBottom: '20px',
                  textAlign: 'center',
                }}
              >
                {eventName}
              </div>
              {location && (
                <div
                  style={{
                    fontSize: '32px',
                    color: '#666',
                    marginBottom: '10px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  📍 {location}
                </div>
              )}
              {date && (
                <div
                  style={{
                    fontSize: '32px',
                    color: '#666',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  📅 {date}
                </div>
              )}
            </div>
          )}

          {/* フッター */}
          <div
            style={{
              position: 'absolute',
              bottom: '40px',
              fontSize: '28px',
              color: '#999',
            }}
          >
            tokudoku.com
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: unknown) {
    const error = e as Error;
    console.log(`Failed to generate OG image: ${error.message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}

/**
 * 使用例:
 * 
 * 基本的な使い方:
 * /api/og?title=TALE&subtitle=地域イベント発見アプリ
 * 
 * イベント情報付き:
 * /api/og?event=大分夏祭り&location=大分市中心部&date=2025年8月15日
 * 
 * このAPIにより、動的にOG画像を生成でき、
 * AI検索エンジンがより豊富なビジュアル情報を取得できます。
 */

