"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { MapPin, Heart, MessageCircle, Share2, Clock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { PostWithAuthor } from '@/types/post';
import { supabase } from '@/lib/supabaseClient';

function formatRemainingTime(expiresAt: number): string {
  const now = Date.now();
  const remainingMillis = expiresAt - now;

  if (remainingMillis <= 0) return "掲載終了";

  const hours = Math.floor(remainingMillis / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMillis % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `残り約${hours}時間${minutes > 0 ? `${minutes}分` : ''}`;
  }
  return `残り約${minutes}分`;
}

interface ExtendedPostWithAuthor extends PostWithAuthor {
  isLikedByCurrentUser?: boolean;
  likes_count: number;
}

interface PostCardProps {
  post: ExtendedPostWithAuthor;
  onLike?: (postId: string, isLiked: boolean) => Promise<void>;
  currentUserId?: string | null;
}

export function PostCard({ post, onLike, currentUserId }: PostCardProps) {
  const handleLikeClick = async () => {
    if (onLike && currentUserId) {
      await onLike(post.id, !(post.isLikedByCurrentUser ?? false));
    } else if (!currentUserId) {
      alert("いいねをするにはログインが必要です。");
    }
  };
  
  const getCategoryColor = (category: string) => {
    switch(category) {
      case '惣菜':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case '弁当':
        return 'bg-green-100 text-green-800 border-green-200';
      case '肉':
        return 'bg-red-100 text-red-800 border-red-200';
      case '魚':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case '野菜':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case '果物':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  const formattedDate = post.created_at ? formatDistanceToNow(new Date(post.created_at), { 
    addSuffix: true,
    locale: ja
  }) : '日付不明';
  
  const discountBadgeVariants = {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1, transition: { delay: 0.2, duration: 0.3 } },
  };

  const authorAvatarUrl = post.author?.avatar_url
    ? supabase.storage.from('avatars').getPublicUrl(post.author.avatar_url).data.publicUrl
    : null;

  const postImageUrl = post.image_url
    ? supabase.storage.from('images').getPublicUrl(post.image_url).data.publicUrl
    : null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-4 pb-2 space-y-0">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={authorAvatarUrl || undefined} alt={post.author?.display_name || '投稿者'} />
              <AvatarFallback>{post.author?.display_name?.charAt(0) || '?'}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{post.author?.display_name || '不明な投稿者'}</p>
              <div className="flex items-center text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 mr-1" />
                <span>{post.store_name || '店舗不明'}</span>
                <span className="mx-1">•</span>
                <span>{formattedDate}</span>
              </div>
            </div>
          </div>
          
          <Badge className={cn("ml-auto", getCategoryColor(post.category || ''))}>
            {post.category || '不明'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-2 flex flex-col">
        <div className="mb-3 flex-grow" style={{ flexBasis: '33.33%' }}>
          <p className="text-base text-muted-foreground whitespace-pre-line line-clamp-3">{post.content || '内容がありません'}</p>
        </div>
        
        {postImageUrl && (
          <div className="relative rounded-md overflow-hidden flex-grow" style={{ flexBasis: '66.66%' }}>
            <img 
              src={postImageUrl} 
              alt="投稿画像" 
              className="w-full h-full object-cover"
            />
            
            <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
              <MapPin className="h-3 w-3 inline-block mr-1" />
              <span>{post.store_name || '店舗不明'}</span>
            </div>

            {post.expires_at && (
              <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                <Clock className="h-3 w-3 inline-block mr-1" />
                <span>{formatRemainingTime(new Date(post.expires_at).getTime())}</span>
              </div>
            )}

            <div className="absolute top-2 right-2 flex flex-col items-end space-y-1">
              {post.discount_rate != null && (
                <motion.div
                  variants={discountBadgeVariants}
                  initial="initial"
                  animate="animate"
                >
                  <Badge className="bg-primary text-primary-foreground font-bold text-lg px-2 py-1 shadow-sm">
                    {post.discount_rate}% OFF
                  </Badge>
                </motion.div>
              )}
              {post.price != null && (
                <Badge className="bg-white text-foreground font-bold text-lg px-2 py-1 shadow-sm">
                  ¥{post.price.toLocaleString()}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="p-2 border-t flex justify-around bg-muted/20">
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex-1 flex items-center justify-center space-x-1.5 text-muted-foreground hover:text-primary transition-colors py-2.5"
          onClick={handleLikeClick}
        >
          <Heart size={18} className={post.isLikedByCurrentUser ? "text-red-500 fill-red-500" : ""} />
          <span className="font-medium text-sm">{post.likes_count || 0}</span>
        </Button>
        
        <Button variant="ghost" size="sm" className="flex-1 flex items-center justify-center space-x-1.5 text-muted-foreground hover:text-primary transition-colors py-2.5">
          <Share2 className="h-4 w-4 mr-1" />
          <span className="font-medium text-sm">共有</span>
        </Button>
      </CardFooter>
    </Card>
  );
}