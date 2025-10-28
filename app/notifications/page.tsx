"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Disc as Discount, ShoppingBag, User, Loader2, Trash2, MailCheck, Square, CheckSquare } from 'lucide-react';
import AppLayout from '@/app/layout';
import { Button } from '@/components/ui/button';
import { Notification } from '@/types/notification';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from 'next-auth/react';
import { formatDistanceToNowStrict } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { CustomModal } from '@/components/ui/custom-modal';
import { useNotification } from '@/contexts/NotificationContext';

export default function NotificationsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const { deleteNotification: contextDeleteNotification } = useNotification();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserAppProfileId, setCurrentUserAppProfileId] = useState<string | null>(null);
  const router = useRouter();

  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [notificationToDeleteId, setNotificationToDeleteId] = useState<string | null>(null);

  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());

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

  const fetchNotifications = useCallback(async () => {
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
    } finally {
      setLoading(false);
    }
  }, [currentUserAppProfileId]);

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
            console.log('Notifications state after realtime INSERT:', payload.new);
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
  }, [sessionStatus, currentUserAppProfileId, fetchNotifications]);

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
  
  const handleMarkSelectedAsRead = async () => {
    if (selectedNotifications.size === 0 || !currentUserAppProfileId) return;

    const idsToMarkRead = Array.from(selectedNotifications);
    
    setNotifications(prev =>
      prev.map(n => 
        idsToMarkRead.includes(n.id) ? { ...n, is_read: true } : n
      )
    );
    setSelectedNotifications(new Set());

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', idsToMarkRead)
        .eq('user_id', currentUserAppProfileId);
      if (error) {
        console.error('Error marking selected notifications as read:', error);
        fetchNotifications();
      }
    } catch (e) {
      console.error('Unexpected error marking selected as read:', e);
      fetchNotifications();
    }
  };

  const handleDeleteNotification = async (id: string) => {
    setNotificationToDeleteId(id);
    setShowDeleteConfirmModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!notificationToDeleteId || !currentUserAppProfileId) return;

    setShowDeleteConfirmModal(false);

    // ローカル状態を即座に更新
    setNotifications(prev => prev.filter(notification => notification.id !== notificationToDeleteId));
    setSelectedNotifications(prev => {
      const newSet = new Set(prev);
      newSet.delete(notificationToDeleteId);
      return newSet;
    });

    try {
      // Contextの削除関数を呼び出して他の画面の通知アイコンも更新
      await contextDeleteNotification(notificationToDeleteId);
      console.log('Notification deleted successfully, triggering realtime update');
    } catch (e) {
      console.error('Unexpected error deleting notification:', e);
      fetchNotifications();
    } finally {
      setNotificationToDeleteId(null);
    }
  };

  const handleDeleteSelectedNotifications = async () => {
    if (selectedNotifications.size === 0 || !currentUserAppProfileId) return;

    if (!confirm('選択された通知をすべて削除してもよろしいですか？この操作は元に戻せません。')) {
      return;
    }

    const idsToDelete = Array.from(selectedNotifications);
    
    // ローカル状態を即座に更新
    setNotifications(prev => prev.filter(n => !idsToDelete.includes(n.id)));
    setSelectedNotifications(new Set());

    try {
      // 各通知を個別にContextの削除関数で削除して他の画面の通知アイコンも更新
      await Promise.all(idsToDelete.map(id => contextDeleteNotification(id)));
      console.log('Selected notifications deleted successfully, triggering realtime update');
    } catch (e) {
      console.error('Unexpected error deleting selected notifications:', e);
      fetchNotifications();
    }
  };

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

  const handleToggleSelectNotification = (id: string) => {
    setSelectedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAllNotifications = () => {
    if (selectedNotifications.size === notifications.length && notifications.length > 0) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(notifications.map(n => n.id)));
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
        {items.map((notification, index) => {
          const isSelected = selectedNotifications.has(notification.id);
          return (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className={`relative group ${isSelected ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}
            >
              <div 
                className={`p-4 border-b flex items-center space-x-3 transition-colors ${notification.is_read ? 'bg-transparent hover:bg-muted/10' : 'bg-primary/5 hover:bg-primary/10'}`}
              >
                <div onClick={(e) => { e.stopPropagation(); handleToggleSelectNotification(notification.id); }} className="cursor-pointer p-2 -ml-2">
                  {isSelected ? (
                    <CheckSquare className="h-5 w-5 text-primary" />
                  ) : (
                    <Square className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>

                <div 
                  className="flex items-center space-x-3 cursor-pointer flex-1"
                  onClick={() => {
                    !notification.is_read && markAsRead(notification.id);
                    if (notification.reference_post_id) {
                      router.push(`/timeline?highlightPostId=${notification.reference_post_id}`);
                    }
                  }}
                >
                  {getIconForType(notification.type)}
                  <div className="flex-1">
                    <p className={`text-sm ${notification.is_read ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatTimeAgo(notification.created_at)}</p>
                  </div>
                </div>
                {!notification.is_read && (
                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" title="未読"></div>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    );
  };

  const isAnyNotificationSelected = selectedNotifications.size > 0;

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
      <div className="flex items-center justify-between p-4 border-b">
        {notifications.length > 0 && (
          <Button 
            variant="outline"
            onClick={handleSelectAllNotifications}
          >
            {selectedNotifications.size === notifications.length && notifications.length > 0 ? 'すべて選択解除' : 'すべて選択'}
          </Button>
        )}
      </div>

      {isAnyNotificationSelected && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="sticky top-[64px] z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b p-3 flex justify-center space-x-4 shadow-sm"
        >
          <Button 
            onClick={handleMarkSelectedAsRead} 
            disabled={selectedNotifications.size === 0}
            className="flex items-center space-x-2"
          >
            <MailCheck size={18} />
            <span>既読にする ({selectedNotifications.size})</span>
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDeleteSelectedNotifications} 
            disabled={selectedNotifications.size === 0}
            className="flex items-center space-x-2"
          >
            <Trash2 size={18} />
            <span>削除 ({selectedNotifications.size})</span>
          </Button>
        </motion.div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ height: isAnyNotificationSelected ? 'calc(100vh - 180px)' : 'calc(100vh - 120px)' }}>
        {renderNotificationList(notifications)}
      </div>

      <CustomModal
        isOpen={showDeleteConfirmModal}
        onClose={() => setShowDeleteConfirmModal(false)}
        title="通知の削除"
        description="この通知を削除してもよろしいですか？この操作は元に戻せません。"
      >
        <div className="flex justify-end space-x-3 mt-4">
          <Button variant="ghost" onClick={() => setShowDeleteConfirmModal(false)}>キャンセル</Button>
          <Button variant="destructive" onClick={handleConfirmDelete}>削除</Button>
        </div>
      </CustomModal>
    </AppLayout>
  );
}