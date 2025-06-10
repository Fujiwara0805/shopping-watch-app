"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Bell, CheckCircle, ExternalLink, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function LineConnectPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  // LINE Bot Basic ID（画像から確認した正しいID）
  const LINE_BOT_ID = '@208subra';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      checkLineConnection();
    }
  }, [status, router]);

  const checkLineConnection = async () => {
    try {
      const response = await fetch('/api/line/check-connection');
      const data = await response.json();
      setIsConnected(data.isConnected);
    } catch (error) {
      console.error('Error checking LINE connection:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = () => {
    // LINE友達追加URLを開く
    const lineAddFriendUrl = `https://line.me/R/ti/p/${LINE_BOT_ID}`;
    window.open(lineAddFriendUrl, '_blank');
    
    toast({
      title: "LINE友達追加",
      description: "LINEアプリで友達追加を完了してください。",
    });
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(LINE_BOT_ID);
    toast({
      title: "コピーしました",
      description: "LINE Bot IDをクリップボードにコピーしました。",
    });
  };

  const handleRefreshStatus = () => {
    setLoading(true);
    checkLineConnection();
  };

  if (status === 'loading' || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="mb-6">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <MessageCircle className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">LINE通知設定</CardTitle>
              <CardDescription>
                お気に入り店舗の新着情報をLINEで受け取れます
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isConnected ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center space-y-4"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      接続済み
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">
                    LINE通知が有効になっています。お気に入り店舗に新しい投稿があると、LINEでお知らせします。
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={handleRefreshStatus}
                    className="mt-4"
                  >
                    接続状況を更新
                  </Button>
                </motion.div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
                      <Bell className="w-5 h-5 mr-2" />
                      LINE通知の特徴
                    </h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• お気に入り店舗の新着投稿をリアルタイムで通知</li>
                      <li>• アプリを開かなくても重要な情報をキャッチ</li>
                      <li>• 通知設定はいつでも変更可能</li>
                    </ul>
                  </div>

                  {/* LINE Bot ID表示 */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">LINE Bot ID</h4>
                    <div className="flex items-center space-x-2">
                      <code className="bg-white px-3 py-2 rounded border text-sm font-mono flex-1">
                        {LINE_BOT_ID}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyId}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      LINEアプリで直接検索することもできます
                    </p>
                  </div>

                  <div className="text-center space-y-4">
                    <p className="text-muted-foreground">
                      下のボタンをタップして、ショッピングウォッチの公式LINEアカウントを友達追加してください。
                    </p>
                    
                    <Button 
                      onClick={handleAddFriend}
                      className="w-full bg-green-500 hover:bg-green-600 text-white"
                      size="lg"
                    >
                      <MessageCircle className="w-5 h-5 mr-2" />
                      LINE友達追加
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>

                    <p className="text-xs text-muted-foreground">
                      友達追加後、数分で通知設定が有効になります
                    </p>

                    <Button 
                      variant="outline" 
                      onClick={handleRefreshStatus}
                      className="mt-4"
                    >
                      接続状況を確認
                    </Button>
                  </div>

                  {/* 手動追加の説明 */}
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="font-medium text-yellow-900 mb-2">手動で友達追加する場合</h4>
                    <ol className="text-sm text-yellow-800 space-y-1">
                      <li>1. LINEアプリを開く</li>
                      <li>2. 友だち追加 → ID検索を選択</li>
                      <li>3. 上記のBot ID「{LINE_BOT_ID}」を入力</li>
                      <li>4. 検索結果から「ショッピングウォッチ」を友達追加</li>
                    </ol>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">プライバシーについて</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                LINE通知機能では、お客様のLINEユーザーIDのみを保存し、お気に入り店舗の新着情報の通知にのみ使用します。
                その他の個人情報は取得・保存いたしません。
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
}
