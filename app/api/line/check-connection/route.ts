import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ユーザーのLINE接続状況を確認
    const { data: userData, error } = await supabase
      .from('app_users')
      .select('line_id')
      .eq('id', session.user.id)
      .single();

    if (error) {
      console.error('Error checking LINE connection:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const isConnected = !!(userData?.line_id);

    return NextResponse.json({ 
      isConnected,
      lineId: userData?.line_id || null
    });
  } catch (error) {
    console.error('Error in LINE connection check:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Webhookイベントからの最新のLINE友達追加を確認して紐付け
    const result = await linkLatestLineUser(session.user.id);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in LINE connection linking:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function linkLatestLineUser(userId: string) {
  try {
    // 1. 現在のユーザーが既にLINE接続を持っているかチェック
    const { data: currentUser, error: userError } = await supabase
      .from('app_users')
      .select('line_id, email')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching current user:', userError);
      return { success: false, error: 'User not found' };
    }

    if (currentUser.line_id) {
      return { 
        success: true, 
        alreadyConnected: true,
        message: 'Already connected to LINE'
      };
    }

    console.log(`User ${userId} is not connected to LINE. Attempting to link...`);

    // 2. 現在のユーザーのメールアドレスでLINE認証履歴を確認
    // （LINE Provider経由でログインしたことがある場合）
    const { data: lineAuthUser, error: lineAuthError } = await supabase
      .from('app_users')
      .select('id, line_id, email')
      .eq('email', currentUser.email)
      .not('line_id', 'is', null)
      .single();

    if (!lineAuthError && lineAuthUser && lineAuthUser.line_id) {
      // 同じメールアドレスで既にLINE認証されたアカウントがある場合、そのline_idを使用
      const { error: updateError } = await supabase
        .from('app_users')
        .update({ line_id: lineAuthUser.line_id })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating user with existing LINE ID:', updateError);
        return { success: false, error: 'Failed to link existing LINE account' };
      }

      console.log(`Successfully linked user ${userId} to existing LINE ID ${lineAuthUser.line_id}`);
      
      return {
        success: true,
        newConnection: true,
        message: 'Successfully connected to existing LINE account',
        lineId: lineAuthUser.line_id
      };
    }

    // 3. 最近友達追加されたが、まだ紐付けられていないLINEユーザーがいるかチェック
    // この場合、具体的な実装は難しいため、代替案として以下のアプローチを取る：
    // - ユーザーに特定のメッセージをLINE Botに送信してもらう
    // - そのメッセージにユニークなコードを含めて、その時点で紐付けを行う

    return { 
      success: false, 
      error: 'LINE connection not found. Please make sure you have added the bot as a friend and try sending "link" message to the bot.' 
    };

  } catch (error) {
    console.error('Error in linkLatestLineUser:', error);
    return { success: false, error: 'Internal server error' };
  }
}