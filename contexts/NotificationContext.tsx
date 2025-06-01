"use client";

import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from 'next-auth/react';
import { Profile } from '@/types/profile'; // AppProfileの型定義をインポート
import { Notification } from '@/types/notification'; // 既存の型定義を流用

interface NotificationContextType {
  unreadCount: number;
  notifications: Notification[]; // 必要であれば全通知リストも管理
  fetchUnreadCount: () => Promise<void>;
  markNotificationAsRead: (notificationId: string) => Promise<void>; // 個別既読
  markAllNotificationsAsRead: () => Promise<void>; // 全件既読
  deleteNotification: (notificationId: string) => Promise<void>; // 追加
  isLoading: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { data: session, status: sessionStatus } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]); // 全通知リストも保持する場合
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserAppProfileId, setCurrentUserAppProfileId] = useState<string | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!currentUserAppProfileId) {
      setUnreadCount(0);
      setNotifications([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      // 未読件数だけを取得するクエリ (より効率的)
      const { count, error: countError } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', currentUserAppProfileId)
        .eq('is_read', false);

      if (countError) {
        console.error('Error fetching unread count:', countError);
        setUnreadCount(0);
      } else {
        setUnreadCount(count ?? 0);
      }

      // 全通知リストも取得する場合 (app/notifications/page.tsx と重複する可能性あり)
      // 必要に応じて最適化 (例: Contextでは件数のみ、リストはページで取得)
      const { data: allNotifications, error: listError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUserAppProfileId)
        .order('created_at', { ascending: false })
        .limit(20); // 最新20件など、制限をかけることを推奨

      if (listError) {
        console.error('Error fetching notifications list for context:', listError);
        setNotifications([]);
      } else if (allNotifications) {
        setNotifications(allNotifications as Notification[]);
      }

    } catch (e) {
      console.error('Unexpected error in fetchUnreadCount:', e);
      setUnreadCount(0);
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserAppProfileId]);

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchUnreadCount();
    } else {
      setUnreadCount(0);
      setNotifications([]);
      setIsLoading(false);
    }
  }, [sessionStatus, fetchUnreadCount]);

  // 現在のユーザーの app_profile_id を取得するEffect
  useEffect(() => {
    const fetchUserAppProfileId = async () => {
      if (session?.user?.id && sessionStatus === 'authenticated') {
        const { data: profileData, error: profileError } = await supabase
          .from('app_profiles')
          .select('id')
          .eq('user_id', session.user.id) // app_profiles.user_id は app_users.id に対応
          .single();

        if (profileError) {
          console.error('NotificationContext: Error fetching current user app_profile_id:', profileError);
          setCurrentUserAppProfileId(null);
        } else if (profileData) {
          setCurrentUserAppProfileId(profileData.id);
        }
      } else {
        setCurrentUserAppProfileId(null);
      }
    };
    fetchUserAppProfileId();
  }, [session?.user?.id, sessionStatus]);

  // Realtime listener for new notifications or updates
  useEffect(() => {
    if (!currentUserAppProfileId || sessionStatus !== 'authenticated') {
      return;
    }

    const channel = supabase
      .channel(`user-notifications-context:${currentUserAppProfileId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE をリッスン
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserAppProfileId}`,
        },
        (payload) => {
          console.log('NotificationContext: Realtime event received', payload);
          // イベントタイプに応じて件数やリストを再計算/再取得
          fetchUnreadCount(); // 簡単のため再取得。より細かく制御も可能
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('NotificationContext: Subscribed to realtime!');
        } else if (err) {
          console.error('NotificationContext: Realtime subscription error', err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserAppProfileId, sessionStatus, fetchUnreadCount]);


  const markNotificationAsRead = async (notificationId: string) => {
    if (!currentUserAppProfileId) return;
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === notificationId ? {...n, is_read: true} : n));
    await fetchUnreadCount(); // 件数再計算

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', currentUserAppProfileId);
    if (error) {
      console.error('Error marking notification as read in context', error);
      fetchUnreadCount(); // Rollback or re-fetch
    }
  };

  const markAllNotificationsAsRead = async () => {
    if (!currentUserAppProfileId) return;
    // Optimistic update
    setNotifications(prev => prev.map(n => ({...n, is_read: true})));
    setUnreadCount(0);

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', currentUserAppProfileId)
      .eq('is_read', false);
    if (error) {
      console.error('Error marking all as read in context', error);
      fetchUnreadCount(); // Rollback or re-fetch
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!currentUserAppProfileId) return;
    // Optimistic update
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    // 未読だった場合は未読件数も減らす
    if (notifications.find(n => n.id === notificationId && !n.is_read)) {
        setUnreadCount(prev => Math.max(0, prev - 1));
    }

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', currentUserAppProfileId); // ユーザーIDも条件に含めることでセキュリティを強化
    if (error) {
      console.error('Error deleting notification in context', error);
      fetchUnreadCount(); // Rollback or re-fetch
    }
  };

  return (
    <NotificationContext.Provider value={{ 
        unreadCount, 
        notifications, 
        fetchUnreadCount,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        deleteNotification,
        isLoading 
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
