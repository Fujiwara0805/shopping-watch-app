"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Disc as Discount, ShoppingBag, User, Loader2 } from 'lucide-react';
import AppLayout from '@/components/layout/app-layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Profile } from '@/types/profile';
import { Notification } from '@/types/notification';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from 'next-auth/react';
import { formatDistanceToNowStrict } from 'date-fns';
import { ja } from 'date-fns/locale';

export default function NotificationsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserAppProfileId, setCurrentUserAppProfileId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserAppProfileId = async () => {
      if (sessionStatus === 'authenticated' && session?.user?.id) {
        const { data: profileData, error: profileError } = await supabase
          .from('app_profiles')
          .select('id')
          .eq('user_id', session.user.id)
          .single();

        if (profileError) {
          console.error('NotificationsPage: Error fetching current user app_profile_id:', profileError);
          setCurrentUserAppProfileId(null);
        } else if (profileData) {
          setCurrentUserAppProfileId(profileData.id);
        }
      } else {
        setCurrentUserAppProfileId(null);
      }
    };
    fetchUserAppProfileId();
  }, [sessionStatus, session?.user?.id]);

  const fetchNotifications = async () => {
    if (!currentUserAppProfileId) return;
    setLoading(true);
    try {
      console.log('Fetching notifications for app_profile_id:', currentUserAppProfileId);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUserAppProfileId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
      } else if (data) {
        setNotifications(data as Notification[]);
        console.log('Fetched notifications successfully:', data);
      }
    } catch (e) {
      console.error('Unexpected error fetching notifications:', e);
      console.log('Notifications state after fetch error:', notifications);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionStatus === 'authenticated' && currentUserAppProfileId) {
      fetchNotifications();

      const channel = supabase
        .channel(`realtime-notifications:${currentUserAppProfileId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${currentUserAppProfileId}`,
          },
          (payload) => {
            console.log('Realtime: New notification received!', payload);
            const newNotification = payload.new as Notification;
            setNotifications((prevNotifications) => {
              if (prevNotifications.find(n => n.id === newNotification.id)) {
                return prevNotifications;
              }
              return [newNotification, ...prevNotifications];
            });
            console.log('Realtime new notification user_id:', newNotification.user_id);
            console.log('Notifications state after realtime INSERT:', payload.new, notifications);
            fetchNotifications();
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log('Subscribed to realtime notifications!');
          }
          if (status === 'CHANNEL_ERROR') {
            console.error('Realtime channel error:', err);
          }
          if (status === 'TIMED_OUT') {
            console.warn('Realtime subscription timed out.');
          }
        });

      return () => {
        console.log('Unsubscribing from realtime notifications');
        supabase.removeChannel(channel);
      };
    } else if (sessionStatus === 'unauthenticated') {
      setLoading(false);
      setNotifications([]);
    }
  }, [sessionStatus, currentUserAppProfileId]);

  const markAsRead = async (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, is_read: true } : notification
      )
    );
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
        .eq('user_id', currentUserAppProfileId!);
      if (error) {
        console.error('Error marking notification as read:', error);
        fetchNotifications();
      }
    } catch (e) {
      console.error('Unexpected error marking as read:', e);
      fetchNotifications();
    }
  };
  
  const markAllAsRead = async () => {
    const unreadNotificationIds = notifications
      .filter(n => !n.is_read)
      .map(n => n.id);

    if (unreadNotificationIds.length === 0) return;

    setNotifications(prev =>
      prev.map(notification => ({ ...notification, is_read: true }))
    );
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadNotificationIds)
        .eq('user_id', currentUserAppProfileId!);
      if (error) {
        console.error('Error marking all notifications as read:', error);
        fetchNotifications();
      }
    } catch (e) {
      console.error('Unexpected error marking all as read:', e);
      fetchNotifications();
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getIconForType = (type: string) => {
    switch (type) {
      case 'favorite_store_post':
        return <ShoppingBag className="h-5 w-5 text-primary" />;
      case 'store':
        return <ShoppingBag className="h-5 w-5 text-primary" />;
      case 'user':
        return <User className="h-5 w-5 text-secondary" />;
      default:
        return <Discount className="h-5 w-5 text-accent" />;
    }
  };
  
  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return '';
    try {
      return formatDistanceToNowStrict(new Date(dateString), { addSuffix: true, locale: ja });
    } catch (error) {
      console.error("Error formatting date:", error, dateString);
      return "不明な時間";
    }
  };

  const renderNotificationList = (items: Notification[]) => {
    if (loading && notifications.length === 0) {
      return (
        <div className="p-8 text-center flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    if (items.length === 0) {
      return (
        <div className="p-8 text-center">
          <p className="text-muted-foreground">通知はありません</p>
        </div>
      );
    }
    
    return (
      <AnimatePresence initial={false}>
        {items.map((notification, index) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
            className="relative"
            onClick={() => !notification.is_read && markAsRead(notification.id)}
          >
            <div className={`p-4 border-b flex items-start space-x-3 cursor-pointer transition-colors ${notification.is_read ? 'bg-transparent hover:bg-muted/10' : 'bg-primary/5 hover:bg-primary/10'}`}>
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                {getIconForType(notification.type)}
              </div>
              
              <div className="flex-1">
                <p className={`${!notification.is_read ? 'font-semibold' : 'font-normal'}`}>
                  {notification.message}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatTimeAgo(notification.created_at)}
                </p>
              </div>
              
              {!notification.is_read && (
                <div className="h-2 w-2 rounded-full bg-accent absolute top-4 right-4" />
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    );
  };

  if (sessionStatus === 'loading') {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-var(--header-height)-var(--footer-height))]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }
  
  if (sessionStatus === 'unauthenticated') {
     return (
      <AppLayout>
        <div className="p-8 text-center">
          <p className="text-muted-foreground">通知を表示するにはログインしてください。</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="pb-4">
        <div className="px-4 pt-2 pb-4 flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 border-b mb-2">
          <h2 className="font-medium text-lg">
            {unreadCount > 0 ? `${unreadCount}件の未読通知` : 'すべて既読'}
          </h2>
          
          {unreadCount > 0 && (
            <Button variant="link" size="sm" onClick={markAllAsRead} disabled={loading && notifications.length > 0}>
              すべて既読にする
            </Button>
          )}
        </div>
        
        <Tabs defaultValue="all">
          <TabsList className="grid grid-cols-3 mx-4 mb-2">
            <TabsTrigger value="all">すべて</TabsTrigger>
            <TabsTrigger value="unread">未読 ({unreadCount})</TabsTrigger>
            <TabsTrigger value="discounts">店舗投稿</TabsTrigger>
          </TabsList>
          
          <div className="overflow-y-auto" style={{maxHeight: 'calc(100vh - var(--header-height) - var(--footer-height) - 120px)'}}>
            <TabsContent value="all" className="mt-0">
              {renderNotificationList(notifications)}
            </TabsContent>
            
            <TabsContent value="unread" className="mt-0">
              {renderNotificationList(notifications.filter(n => !n.is_read))}
            </TabsContent>
            
            <TabsContent value="discounts" className="mt-0">
              {renderNotificationList(notifications.filter(n => n.type === 'favorite_store_post'))}
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </AppLayout>
  );
}