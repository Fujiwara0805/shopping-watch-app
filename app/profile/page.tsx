"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bell, LogOut, Settings, Edit, MapPin, Heart } from 'lucide-react';
import AppLayout from '@/components/layout/app-layout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { PostCard } from '@/components/posts/post-card';
import { mockPosts } from '@/lib/mock-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface User {
  displayName: string;
  email: string;
  avatar?: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  // Get user data from localStorage
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      // Create default user data if not exists
      const defaultUser = {
        displayName: 'ゲストユーザー',
        email: 'guest@example.com',
      };
      setUser(defaultUser);
      localStorage.setItem('user', JSON.stringify(defaultUser));
    }
    
    // Simulate loading delay
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);
  
  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    router.push('/login');
  };
  
  // Filter posts by the current user
  const userPosts = mockPosts.filter(post => 
    post.author.name === user?.displayName
  );
  
  return (
    <AppLayout>
      <div className="p-4">
        {loading ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={user?.avatar} alt={user?.displayName} />
                  <AvatarFallback>{user?.displayName.charAt(0)}</AvatarFallback>
                </Avatar>
                
                <div>
                  <h1 className="text-xl font-bold">{user?.displayName}</h1>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              
              <Button 
                variant="ghost" 
                size="icon"
                asChild
              >
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Edit className="h-5 w-5" />
                </motion.div>
              </Button>
            </div>
            
            <div className="grid grid-cols-3 gap-2 mb-6">
              <div className="flex flex-col items-center justify-center p-3 bg-muted rounded-lg">
                <p className="text-xl font-bold">{userPosts.length}</p>
                <p className="text-xs text-muted-foreground">投稿</p>
              </div>
              <div className="flex flex-col items-center justify-center p-3 bg-muted rounded-lg">
                <p className="text-xl font-bold">5</p>
                <p className="text-xs text-muted-foreground">お気に入り店舗</p>
              </div>
              <div className="flex flex-col items-center justify-center p-3 bg-muted rounded-lg">
                <p className="text-xl font-bold">12</p>
                <p className="text-xs text-muted-foreground">貢献度</p>
              </div>
            </div>
            
            <Tabs defaultValue="posts">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="posts">投稿履歴</TabsTrigger>
                <TabsTrigger value="favorites">お気に入り</TabsTrigger>
                <TabsTrigger value="settings">設定</TabsTrigger>
              </TabsList>
              
              <TabsContent value="posts" className="space-y-4">
                {userPosts.length > 0 ? (
                  userPosts.map(post => (
                    <PostCard key={post.id} post={post} />
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-muted-foreground">まだ投稿がありません</p>
                    <Button 
                      variant="link" 
                      onClick={() => router.push('/post')}
                      className="mt-2"
                    >
                      最初の投稿を作成する
                    </Button>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="favorites">
                <div className="space-y-4">
                  {mockPosts.slice(0, 2).map(post => (
                    <PostCard key={post.id} post={post} />
                  ))}
                  
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-start space-x-3">
                      <MapPin className="text-primary h-5 w-5" />
                      <div>
                        <h3 className="font-medium">お気に入り店舗</h3>
                        <p className="text-sm text-muted-foreground">5件のスーパーをお気に入りに登録しています</p>
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="p-0 h-auto mt-1"
                          onClick={() => router.push('/map')}
                        >
                          <Heart className="h-4 w-4 mr-1" />
                          お気に入り店舗を管理
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="settings">
                <div className="space-y-6">
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
                        onClick={() => {}}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        アカウント設定
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        className="w-full justify-start" 
                        onClick={() => {}}
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
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AppLayout>
  );
}