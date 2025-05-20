"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Disc as Discount, ShoppingBag, User } from 'lucide-react';
import AppLayout from '@/components/layout/app-layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { mockNotifications } from '@/lib/mock-data';
import { Notification } from '@/types/notification';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  
  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };
  
  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
  const getIconForType = (type: string) => {
    switch (type) {
      case 'discount':
        return <Discount className="h-5 w-5 text-accent" />;
      case 'store':
        return <ShoppingBag className="h-5 w-5 text-primary" />;
      case 'user':
        return <User className="h-5 w-5 text-secondary" />;
      default:
        return <Discount className="h-5 w-5 text-accent" />;
    }
  };
  
  const renderNotificationList = (items: Notification[]) => {
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
            onClick={() => markAsRead(notification.id)}
          >
            <div className="p-4 border-b flex items-start space-x-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                {getIconForType(notification.type)}
              </div>
              
              <div className="flex-1">
                <p className={`${!notification.read ? 'font-medium' : ''}`}>
                  {notification.message}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {notification.timeAgo}
                </p>
              </div>
              
              {!notification.read && (
                <div className="h-2 w-2 rounded-full bg-accent absolute top-4 right-4" />
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    );
  };

  return (
    <AppLayout>
      <div className="pb-4">
        <div className="px-4 pt-2 pb-4 flex items-center justify-between">
          <h2 className="font-medium">
            {unreadCount > 0 ? `${unreadCount}件の未読通知` : 'すべて既読済み'}
          </h2>
          
          {unreadCount > 0 && (
            <Button variant="link" size="sm" onClick={markAllAsRead}>
              すべて既読にする
            </Button>
          )}
        </div>
        
        <Tabs defaultValue="all">
          <TabsList className="grid grid-cols-3 mx-4 mb-2">
            <TabsTrigger value="all">すべて</TabsTrigger>
            <TabsTrigger value="unread">未読</TabsTrigger>
            <TabsTrigger value="discounts">値引き</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-0">
            {renderNotificationList(notifications)}
          </TabsContent>
          
          <TabsContent value="unread" className="mt-0">
            {renderNotificationList(notifications.filter(n => !n.read))}
          </TabsContent>
          
          <TabsContent value="discounts" className="mt-0">
            {renderNotificationList(notifications.filter(n => n.type === 'discount'))}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}