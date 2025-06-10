"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { MessageCircle, Bell, CheckCircle, ExternalLink, Copy, RefreshCw, Link, User, Clock, AlertTriangle, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RecentFollow {
  lineUserId: string;
  displayName: string;
  timestamp: string;
}

export default function LineConnectPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [manualLinkId, setManualLinkId] = useState('');
  const [manualLinking, setManualLinking] = useState(false);
  const [showManualLink, setShowManualLink] = useState(false);
  const [recentFollows, setRecentFollows] = useState<RecentFollow[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  // LINE Bot Basic ID
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
      setLoading(true);
      const response = await fetch('/api/line/check-connection');
      const data = await response.json();
      setIsConnected(data.isConnected);
      
      if (data.isConnected) {
        toast({
          title: "LINE接続確認完了",
          description: "LINEアカウントが正常に接続されています。",
        });
      }
    } catch (error) {
      console.error('Error checking LINE connection:', error);
      toast({
        title: "接続確認エラー",
        description: "LINE接続状況の確認に失敗しました。",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLinkConnection = async () => {
    try {
      setLinking(true);
      const response = await fetch('/api/line/check-connection', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        setIsConnected(true);
        if (data.newConnection) {
          toast({
            title: "LINE接続完了！",
            description: "LINEアカウントが正常に接続されました。通知の受信が開始されます。",
          });
        } else if (data.alreadyConnected) {
          toast({
            title: "既に接続済み",
            description: "LINEアカウントは既に接続されています。",
          });
        }
      } else {
        toast({
          title: "自動接続失敗",
          description: "自動接続に失敗しました。手動接続をお試しください。",
          variant: "destructive"
        });
        setShowManualLink(true);
        await loadRecentFollows();
      }
    } catch (error) {
      console.error('Error linking LINE connection:', error);
      toast({
        title: "接続エラー",
        description: "LINE接続処理でエラーが発生しました。",
        variant: "destructive"
      });
      setShowManualLink(true);
    } finally {
      setLinking(false);
    }
  };

  const loadRecentFollows = async () => {
    try {
      setLoadingRecent(true);
      const response = await fetch('/api/line/manual-link');
      const data = await response.json();
      
      if (response.ok) {
        setRecentFollows(data.recentFollows || []);
      }
    } catch (error) {
      console.error('Error loading recent follows:', error);
    } finally {
      setLoadingRecent(false);
    }
  };

  const handleManualLink = async () => {
    if (!manualLinkId.trim()) {
      toast({
        title: "入力エラー",
        description: "LINE User IDを入力してください。",
        variant: "destructive"
      });
      return;
    }

    try {
      setManualLinking(true);
      const response = await fetch('/api/line/manual-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lineUserId: manualLinkId.trim()
        })
      });

      const data = await response.json();

      if (response.ok) {
        setIsConnected(true);
        setShowManualLink(false);
        toast({
          title: "手動接続完了！",
          description: "LINEアカウントが正常に接続されました。",
        });
      } else {
        toast({
          title: "手動接続失敗",
          description: data.error || "接続に失敗しました。",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error manual linking:', error);
      toast({
        title: "接続エラー",
        description: "手動接続処理でエラーが発生しました。",
        variant: "destructive"
      });
    } finally {
      setManualLinking(false);
    }
  };

  const handleAddFriend = () => {
    const lineAddFriendUrl = `https://line.me/R/ti/p/${LINE_BOT_ID}`;
    window.open(lineAddFriendUrl, '_blank');
    
    toast({
      title: "LINE友達追加",
      description: "LINEアプリで友達追加を完了してから、「接続確認」ボタンをタップしてください。",
    });
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(LINE_BOT_ID);
    toast({
      title: "コピーしました",
      description: "LINE Bot IDをクリップボードにコピーしました。",
    });
  };

  const handleCopyLineUserId = (userId: string) => {
    navigator.clipboard.writeText(userId);
    setManualLinkId(userId);
    toast({
      title: "LINE User IDをコピーしました",
      description: "手動接続の入力欄に設定されました。",
    });
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
          className="space-y-6"
        >
          <Card>
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
                    onClick={checkLineConnection}
                    disabled={loading}
                    className="mt-4"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
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
                    <p className="text-muted-foreground text-sm">
                      LINE通知を受け取るには、以下の手順に従ってください：
                    </p>
                    
                    <div className="bg-yellow-50 p-4 rounded-lg text-left">
                      <h4 className="font-medium text-yellow-900 mb-2">📱 設定手順</h4>
                      <ol className="text-sm text-yellow-800 space-y-1">
                        <li>1. 下の「LINE友達追加」ボタンをタップ</li>
                        <li>2. LINEアプリで友達追加を完了</li>
                        <li>3. このページに戻って「接続確認」ボタンをタップ</li>
                        <li>4. 接続完了！</li>
                      </ol>
                      <p className="text-xs text-yellow-700 mt-2">
                        ※ 自動連携に時間がかかる場合があります。うまくいかない場合は手動接続をお試しください。
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <Button 
                        onClick={handleAddFriend}
                        className="w-full bg-green-500 hover:bg-green-600 text-white"
                        size="lg"
                      >
                        <MessageCircle className="w-5 h-5 mr-2" />
                        LINE友達追加
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </Button>

                      <Button 
                        onClick={handleLinkConnection}
                        disabled={linking}
                        variant="outline"
                        className="w-full"
                        size="lg"
                      >
                        {linking ? (
                          <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="w-5 h-5 mr-2" />
                        )}
                        {linking ? '確認中...' : '接続確認'}
                      </Button>

                      {!showManualLink && (
                        <Button 
                          onClick={() => {
                            setShowManualLink(true);
                            loadRecentFollows();
                          }}
                          variant="ghost"
                          className="w-full text-sm"
                          size="sm"
                        >
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          うまく接続できない場合は手動接続
                        </Button>
                      )}
                    </div>

                    {/* 手動接続セクション */}
                    {showManualLink && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ duration: 0.3 }}
                        className="mt-6"
                      >
                        <Separator className="my-4" />
                        
                        <div className="bg-orange-50 p-4 rounded-lg text-left">
                          <h4 className="font-medium text-orange-900 mb-3 flex items-center">
                            <Link className="w-5 h-5 mr-2" />
                            手動接続
                          </h4>
                          
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="line-user-id" className="text-sm font-medium text-gray-700">
                                LINE User ID
                              </Label>
                              <div className="mt-1 flex space-x-2">
                                <Input
                                  id="line-user-id"
                                  value={manualLinkId}
                                  onChange={(e) => setManualLinkId(e.target.value)}
                                  placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                  className="flex-1"
                                />
                                <Button
                                  onClick={handleManualLink}
                                  disabled={manualLinking}
                                  size="sm"
                                >
                                  {manualLinking ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Link className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                LINEでBotに「debug」と送信すると、あなたのUser IDが表示されます
                              </p>
                            </div>

                            {/* 最近の友達追加一覧 */}
                            {recentFollows.length > 0 && (
                              <div>
                                <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                                  <Clock className="w-4 h-4 mr-1" />
                                  最近の友達追加
                                </h5>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                  {recentFollows.map((follow, index) => (
                                    <div
                                      key={follow.lineUserId}
                                      className="flex items-center justify-between p-2 bg-white rounded border border-gray-200 text-xs"
                                    >
                                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                                        <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                        <div className="min-w-0 flex-1">
                                          <p className="font-medium text-gray-900 truncate">
                                            {follow.displayName}
                                          </p>
                                          <p className="text-gray-500 truncate">
                                            {follow.lineUserId}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-1 flex-shrink-0">
                                        <span className="text-gray-400">
                                          {new Date(follow.timestamp).toLocaleDateString('ja-JP', {
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </span>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleCopyLineUserId(follow.lineUserId)}
                                          className="h-6 w-6 p-0"
                                        >
                                          <Copy className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {loadingRecent && (
                              <div className="text-center">
                                <RefreshCw className="w-4 h-4 animate-spin mx-auto" />
                                <p className="text-xs text-gray-500 mt-1">友達追加履歴を読み込み中...</p>
                              </div>
                            )}
                          </div>

                          <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                            <div className="flex items-start space-x-2">
                              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                              <div className="text-xs text-blue-800">
                                <p className="font-medium mb-1">LINE User IDの確認方法：</p>
                                <ol className="space-y-1">
                                  <li>1. LINEでBotを友達追加</li>
                                  <li>2. Botに「debug」とメッセージを送信</li>
                                  <li>3. 返信されたUser IDをコピーして上の欄に貼り付け</li>
                                </ol>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <p className="text-xs text-muted-foreground">
                      友達追加後、「接続確認」ボタンで接続状況を確認できます
                    </p>
                  </div>

                  {/* 手動追加の説明 */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">🔍 手動で友達追加する場合</h4>
                    <ol className="text-sm text-gray-700 space-y-1">
                      <li>1. LINEアプリを開く</li>
                      <li>2. 友だち追加 → ID検索を選択</li>
                      <li>3. 上記のBot ID「{LINE_BOT_ID}」を入力</li>
                      <li>4. 検索結果から「ショッピングウォッチ」を友達追加</li>
                      <li>5. このページで「接続確認」ボタンをタップ</li>
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
                その他の個人情報は取得・保存いたしません。通知の配信停止はいつでも可能です。
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
}