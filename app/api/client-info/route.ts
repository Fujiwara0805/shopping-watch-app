import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // リクエストヘッダーからIPアドレスを取得
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || request.ip || 'unknown';
  
  return NextResponse.json({
    ip: ip,
    userAgent: request.headers.get('user-agent') || 'unknown'
  });
}
