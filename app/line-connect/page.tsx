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
import { MessageCircle, Bell, CheckCircle, ExternalLink, Copy, RefreshCw, Link, User, Clock, AlertTriangle, Info, ArrowLeft, QrCode, Smartphone } from 'lucide-react';
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
  const [showQRCode, setShowQRCode] = useState(false);
  const [isAddFriendClicked, setIsAddFriendClicked] = useState(false);

  // 正しいLINE Bot Basic ID
  const LINE_BOT_ID = '@208uubra';

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

  // 改善されたLINE友達追加機能
  const handleAddFriend = () => {
    setIsAddFriendClicked(true);
    
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    const isMobile = isIOS || isAndroid;
    
    // デバッグ用ログ追加
    console.log('LINE友達追加開始:', {
      botId: LINE_BOT_ID,
      userAgent,
      isIOS,
      isAndroid,
      isMobile
    });
    
    try {
      if (isMobile) {
        if (isIOS) {
          // iOS版 - より確実な方法
          const iosLineUrl = `line://ti/p/${LINE_BOT_ID}`;
          const fallbackUrl = `https://line.me/R/ti/p/${LINE_BOT_ID}`;
          
          console.log('iOS LINE URL:', iosLineUrl);
          console.log('iOS Fallback URL:', fallbackUrl);
          
          // LINEアプリを開く試行
          window.location.href = iosLineUrl;
          
          // フォールバック処理（2秒後）
          setTimeout(() => {
            if (!document.hidden) {
              window.open(fallbackUrl, '_blank');
            }
          }, 2000);
          
        } else if (isAndroid) {
          // Android版 - Intent URLとフォールバック
          const fallbackUrl = `https://line.me/R/ti/p/${LINE_BOT_ID}`;
          const androidUrl = `intent://ti/p/${LINE_BOT_ID}#Intent;scheme=line;package=jp.naver.line.android;S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end`;
          
          console.log('Android Intent URL:', androidUrl);
          console.log('Android Fallback URL:', fallbackUrl);
          
          window.location.href = androidUrl;
        }
      } else {
        // デスクトップの場合
        const webUrl = `https://line.me/R/ti/p/${LINE_BOT_ID}`;
        console.log('Desktop LINE URL:', webUrl);
        window.open(webUrl, '_blank');
      }
      
      toast({
        title: "LINE友達追加",
        description: "LINEの友達追加ページが開きます。友達追加を完了してから「接続確認」ボタンをタップしてください。",
        duration: 8000,
      });
      
    } catch (error) {
      console.error('LINE友達追加でエラーが発生:', error);
      // エラー時のフォールバック
      const fallbackUrl = `https://line.me/R/ti/p/${LINE_BOT_ID}`;
      window.open(fallbackUrl, '_blank');
      
      toast({
        title: "LINE友達追加",
        description: "LINEで友達追加を完了してください。",
        variant: "default"
      });
    }
    
    // 状態をリセット
    setTimeout(() => {
      setIsAddFriendClicked(false);
    }, 3000);
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

  const handleBackToProfile = () => {
    router.push('/profile');
  };

  if (status === 'loading' || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full"
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-2xl">
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
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      onClick={checkLineConnection}
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      接続状況を更新
                    </Button>
                    
                    <Button 
                      onClick={handleBackToProfile}
                      className="w-full"
                      style={{ backgroundColor: '#73370c' }}
                    >
                      プロフィールに戻る
                    </Button>
                  </div>
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
                      <h4 className="font-medium text-yellow-900 mb-2 flex items-center">
                        <Smartphone className="w-5 h-5 mr-2" />
                        📱 設定手順
                      </h4>
                      <ol className="text-sm text-yellow-800 space-y-1">
                        <li>1. 下の「LINE友達追加」ボタンをタップ</li>
                        <li>2. LINEアプリで友達追加を完了</li>
                        <li>3. このページに戻って「接続確認」ボタンをタップ</li>
                        <li>4. 接続完了！</li>
                      </ol>
                    </div>
                    
                    <div className="space-y-3">
                      {/* 友達追加ボタン */}
                      <Button 
                        onClick={handleAddFriend}
                        disabled={isAddFriendClicked}
                        className="w-full bg-green-500 hover:bg-green-600 text-white relative overflow-hidden"
                        size="lg"
                      >
                        {isAddFriendClicked ? (
                          <>
                            <CheckCircle className="w-5 h-5 mr-2" />
                            LINEアプリを開いています...
                          </>
                        ) : (
                          <>
                            <MessageCircle className="w-5 h-5 mr-2" />
                            LINE友達追加
                            <ExternalLink className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>

                      {/* QRコード表示ボタンを追加 */}
                      <Button 
                        onClick={() => setShowQRCode(!showQRCode)}
                        variant="outline"
                        className="w-full"
                        size="lg"
                      >
                        <QrCode className="w-5 h-5 mr-2" />
                        QRコードで友達追加
                      </Button>

                      {/* QRコード表示エリア */}
                      {showQRCode && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-white p-4 rounded-lg border text-center"
                        >
                          <p className="text-sm text-gray-600 mb-3">
                            LINEアプリでQRコードを読み取ってください
                          </p>
                          
                          {/* QRコード画像（LINE公式のQRコード生成URLを使用） */}
                          <div className="flex justify-center mb-3">
                            <img 
                              src={`https://qr-official.line.me/gs/M_${LINE_BOT_ID.replace('@', '')}_GW.png`}
                              alt="LINE QR Code"
                              className="w-48 h-48 border rounded-lg"
                              onError={(e) => {
                                // QRコード読み込みエラー時のフォールバック
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = `
                                    <div class="w-48 h-48 border rounded-lg flex items-center justify-center bg-gray-100">
                                      <div class="text-center">
                                        <div class="w-12 h-12 mx-auto mb-2 text-gray-400">📱</div>
                                        <p class="text-sm text-gray-500">QRコードを表示できません</p>
                                        <p class="text-xs text-gray-400 mt-1">Bot ID: ${LINE_BOT_ID}</p>
                                      </div>
                                    </div>
                                  `;
                                }
                              }}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <p className="text-xs text-gray-500">
                              または、LINEアプリで「{LINE_BOT_ID}」を検索
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleCopyId}
                              className="text-xs"
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Bot IDをコピー
                            </Button>
                          </div>
                        </motion.div>
                      )}

                      {/* 接続確認ボタン */}
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
                          <Link className="w-5 h-5 mr-2" />
                        )}
                        {linking ? '接続確認中...' : '接続確認'}
                      </Button>
                    </div>

                    {/* 手動案内セクションを追加 */}
                    <div className="bg-yellow-50 p-4 rounded-lg text-left mt-4">
                      <h4 className="font-medium text-yellow-900 mb-2 flex items-center">
                        <Info className="w-5 h-5 mr-2" />
                        📱 手動で友達追加する方法
                      </h4>
                      <ol className="text-sm text-yellow-800 space-y-2">
                        <li>1. LINEアプリを開く</li>
                        <li>2. 「友だち追加」→「検索」をタップ</li>
                        <li>3. 「ID」を選択して「{LINE_BOT_ID}」を入力</li>
                        <li>4. 検索結果から「トクドク」を友達追加</li>
                        <li>5. このページに戻って「接続確認」をタップ</li>
                      </ol>
                    </div>

                    {/* デバッグ情報（開発時のみ表示） */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="bg-gray-50 p-3 rounded-lg text-xs mt-4">
                        <h5 className="font-medium mb-2">デバッグ情報:</h5>
                        <div className="space-y-1 text-gray-600">
                          <p>Bot ID: {LINE_BOT_ID}</p>
                          <p>User Agent: {typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}</p>
                          <p>URL: https://line.me/R/ti/p/{LINE_BOT_ID}</p>
                          <p>
                            <a 
                              href={`https://line.me/R/ti/p/${LINE_BOT_ID}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              URLをテスト
                            </a>
                          </p>
                        </div>
                      </div>
                    )}
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
          <div className="flex items-center space-x-4 mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackToProfile}
              className="flex items-center space-x-2"
            >
              <span>プロフィールに戻る</span>
            </Button>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}