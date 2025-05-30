"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bell, LogOut, Settings, Edit, MapPin, Heart, Store as StoreIcon } from 'lucide-react';
import AppLayout from '@/components/layout/app-layout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { PostCard } from '@/components/posts/post-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useSession, signOut } from 'next-auth/react';
import { supabase } from '@/lib/supabaseClient';
import { PostWithAuthor, AuthorProfile } from '@/types/post';

interface AppProfile {
  id: string;
  user_id: string;
  display_name: string;
  bio?: string | null;
  avatar_url?: string | null;
  updated_at?: string;
  favorite_store_1_id?: string | null;
  favorite_store_1_name?: string | null;
  favorite_store_2_id?: string | null;
  favorite_store_2_name?: string | null;
  favorite_store_3_id?: string | null;
  favorite_store_3_name?: string | null;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userPosts, setUserPosts] = useState<PostWithAuthor[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("posts");
  
  // ポイント表示用の仮のstate (将来的にはprofileオブジェクトから取得)
  const [userPoints, setUserPoints] = useState(0); // 仮に0ポイントで初期化

  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    if (!session || !session.user?.id) {
      router.push('/login?callbackUrl=/profile');
      return;
    }

    const fetchProfileAndPosts = async () => {
      setLoading(true);
      setLoadingPosts(true);
      try {
        const { data: appProfileData, error: profileError } = await supabase
          .from('app_profiles')
          .select(
            '*, favorite_store_1_id, favorite_store_1_name, favorite_store_2_id, favorite_store_2_name, favorite_store_3_id, favorite_store_3_name'
          )
          .eq('user_id', session.user!.id!)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error fetching profile from app_profiles:', profileError);
          setLoading(false);
          setLoadingPosts(false);
          return;
        }

        if (appProfileData) {
          setProfile(appProfileData);
          // TODO: 将来的には appProfileData からポイントを取得する
          // setUserPoints(appProfileData.points || 0); 

          const { data: postsData, error: postsError } = await supabase
            .from('posts')
            .select(`
              id,
              app_profile_id,
              store_id,
              store_name,
              category,
              content,
              image_url,
              discount_rate,
              price,
              expiry_option,
              created_at,
              likes_count,
              app_profiles (
                display_name,
                avatar_url
              )
            `)
            .eq('app_profile_id', appProfileData.id)
            .order('created_at', { ascending: false });

          if (postsError) {
            console.error('Error fetching posts:', postsError);
          } else if (postsData) {
            const fetchedPosts: PostWithAuthor[] = postsData.map((p: any) => {
              let expires_at_string = new Date().toISOString();
              if (p.expiry_option && p.created_at) {
                  const createdAtDate = new Date(p.created_at);
                  if (p.expiry_option === '1h') createdAtDate.setHours(createdAtDate.getHours() + 1);
                  else if (p.expiry_option === '3h') createdAtDate.setHours(createdAtDate.getHours() + 3);
                  else if (p.expiry_option === '24h') createdAtDate.setHours(createdAtDate.getHours() + 24);
                  expires_at_string = createdAtDate.toISOString();
              }

              return {
                id: p.id,
                store_id: p.store_id,
                store_name: p.store_name,
                category: p.category,
                content: p.content,
                image_url: p.image_url,
                discount_rate: p.discount_rate,
                price: p.price,
                expiry_option: p.expiry_option,
                created_at: p.created_at,
                expires_at: expires_at_string,
                likes_count: p.likes_count || 0,
                likes: p.likes_count || 0,
                comments: 0,

                author: p.app_profiles ? {
                  display_name: p.app_profiles.display_name,
                  avatar_url: p.app_profiles.avatar_url,
                } : null,
              };
            });
            setUserPosts(fetchedPosts);
          }
        } else {
          console.log('No profile found in app_profiles, redirecting to setup.');
          router.push('/profile/setup');
          return;
        }
      } catch (e) {
        console.error('An unexpected error occurred while fetching data:', e);
      } finally {
        setLoading(false);
        setLoadingPosts(false);
      }
    };

    fetchProfileAndPosts();

  }, [session, status, router]);
  
  const handleLogout = async () => {
    await signOut({ redirect: false, callbackUrl: '/login' });
    router.push('/login');
  };
  
  if (status === 'loading' || loading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <Skeleton className="h-16 w-16 rounded-full mb-2" />
          <Skeleton className="h-5 w-40 mb-1" />
          <Skeleton className="h-4 w-32 mb-6" />
          <Skeleton className="h-32 w-full max-w-md" />
        </div>
      </AppLayout>
    );
  }
  
  if (!profile) {
    return (
        <AppLayout>
            <div className="flex items-center justify-center min-h-screen">
                <p>プロフィール情報を読み込めませんでした。</p>
            </div>
        </AppLayout>
    );
  }
  
  return (
    <AppLayout>
      {/* プロフィールヘッダー部分 - 完全固定 */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="p-4">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                {profile.avatar_url ? (
                  <AvatarImage
                    src={supabase.storage.from('avatars').getPublicUrl(profile.avatar_url).data.publicUrl}
                    alt={profile.display_name ?? 'User Avatar'}
                  />
                ) : (
                  <AvatarFallback>{profile.display_name?.charAt(0).toUpperCase() ?? 'U'}</AvatarFallback>
                )}
              </Avatar>
              
              <div>
                <h1 className="text-xl font-bold">{profile.display_name}</h1>
                <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              asChild
            >
              <motion.div
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/profile/edit')}
              >
                <Edit className="h-5 w-5" />
              </motion.div>
            </Button>
          </div>
          
          {/* 投稿数とポイント表示 */}
          <div className="grid grid-cols-2 gap-4 text-center mb-4">
            <motion.div 
              className="p-4 bg-card rounded-lg shadow-sm"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <p className="text-2xl font-bold">{userPosts.length}</p>
              <p className="text-sm text-muted-foreground">投稿数</p>
            </motion.div>
            <motion.div 
              className="p-4 bg-card rounded-lg shadow-sm"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <p className="text-2xl font-bold">{userPoints}</p> 
              <p className="text-sm text-muted-foreground">ポイント</p>
            </motion.div>
          </div>
        </div>
      </div>
      
      {/* 単一の Tabs コンポーネントでラップ */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* タブヘッダー部分 */}
        <div className="sticky top-[calc(var(--header-height,0px)+1px)] z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 pb-3">
          {/* 上のヘッダーの高さを考慮して top 位置を調整する必要があるかもしれません。
              ここでは仮に var(--header-height) としていますが、実際のヘッダーの高さに合わせて調整してください。
              現状のコードではプロフィールヘッダーが固定されているため、その高さを考慮します。
              プロフィールヘッダーの正確な高さが不明なため、一旦 `180px` のような固定値で試すか、
              JavaScriptで動的に計算するなどの対応が必要になります。
              簡単のため、ここでは `top-0` のままにして、スクロール追従ヘッダーは一旦なくし、
              タブヘッダーがコンテンツと一緒にスクロールするようにします。
              より良いUIのためには、ヘッダーの高さを正確に把握し、stickyのtop値を調整することが推奨されます。
          */}
           <div className="px-4 pb-3 sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
            <TabsList className="grid w-full grid-cols-3 bg-muted/50">
              <TabsTrigger value="posts">投稿履歴</TabsTrigger>
              <TabsTrigger value="favorites" className="text-base">お気に入り</TabsTrigger>
              <TabsTrigger value="settings" className="text-base">設定</TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* タブコンテンツ部分 - スクロール可能領域 */}
        {/* 投稿履歴タブ */}
        <TabsContent value="posts" className="mt-0">
          {loadingPosts ? (
            <div className="p-4 space-y-4">
              <Skeleton className="h-48 w-full rounded-lg" />
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
          ) : userPosts.length > 0 ? (
            <div 
              className="custom-scrollbar overscroll-none"
              style={{ 
                height: 'calc(100vh - 380px)',
                maxHeight: 'calc(100vh - 380px)',
                overflowY: 'auto',
                overflowX: 'hidden'
              }}
            >
              <div className="p-4 space-y-4 pb-safe">
                {userPosts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <PostCard post={post} />
                  </motion.div>
                ))}
                {/* 最後の投稿の下に余白を追加 */}
                <div className="h-4"></div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">まだ投稿がありません</p>
              <Button 
                variant="link" 
                onClick={() => router.push('/post/new')}
                className="mt-2"
              >
                最初の投稿を作成する
              </Button>
            </div>
          )}
        </TabsContent>
        
        {/* お気に入りタブ */}
        <TabsContent value="favorites" className="mt-0">
          <div 
            className="custom-scrollbar overscroll-none"
            style={{ 
              height: 'calc(100vh - 380px)',
              maxHeight: 'calc(100vh - 380px)',
              overflowY: 'auto',
              overflowX: 'hidden'
            }}
          >
            <div className="p-4 space-y-4 pb-safe">
              <h2 className="text-xl font-semibold">お気に入り店舗</h2>
              {profile && (profile.favorite_store_1_id || profile.favorite_store_2_id || profile.favorite_store_3_id) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { id: profile.favorite_store_1_id, name: profile.favorite_store_1_name },
                    { id: profile.favorite_store_2_id, name: profile.favorite_store_2_name },
                    { id: profile.favorite_store_3_id, name: profile.favorite_store_3_name },
                  ]
                    .filter(store => store.id && store.name)
                    .map((store, index) => (
                      <motion.div
                        key={store.id || index}
                        className="p-4 border rounded-lg shadow-sm bg-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        <div className="flex items-center space-x-3">
                          <StoreIcon className="h-8 w-8 text-primary" />
                          <div>
                            <p className="font-semibold text-lg">{store.name}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <Heart className="mx-auto h-12 w-12 mb-2" />
                  <p>お気に入り店舗はまだ登録されていません。</p>
                  <Button variant="link" onClick={() => router.push('/profile/edit')} className="mt-2">
                    プロフィール編集画面から追加する
                  </Button>
                </div>
              )}
              {/* 余白を追加 */}
              <div className="h-4"></div>
            </div>
          </div>
        </TabsContent>
        
        {/* 設定タブ */}
        <TabsContent value="settings" className="mt-0">
          <div 
            className="custom-scrollbar overscroll-none"
            style={{ 
              height: 'calc(100vh - 380px)',
              maxHeight: 'calc(100vh - 380px)',
              overflowY: 'auto',
              overflowX: 'hidden'
            }}
          >
            <div className="p-4 space-y-6 pb-safe">
              <div>
                <h3 className="font-medium mb-2">通知設定</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="push-notifications">プッシュ通知</Label>
                      <p className="text-xs text-muted-foreground">お気に入り店舗の値引き情報をお知らせします</p>
                    </div>
                    <Switch id="push-notifications" defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="email-notifications">メール通知</Label>
                      <p className="text-xs text-muted-foreground">メールでお得情報をお知らせします</p>
                    </div>
                    <Switch id="email-notifications" />
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-medium mb-2">アカウント</h3>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    onClick={() => router.push('/profile/edit')}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    アカウント設定
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    onClick={() => { /* TODO: 通知設定ページへ */ }}
                  >
                    <Bell className="mr-2 h-4 w-4" />
                    通知設定
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-destructive" 
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    ログアウト
                  </Button>
                </div>
              </div>
              {/* 余白を追加 */}
              <div className="h-4"></div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}