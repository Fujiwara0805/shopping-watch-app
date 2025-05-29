"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { MapPin, ThumbsUp, MessageCircle, Share2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { PostWithAuthor as Post } from '@/types/post';
import { supabase } from '@/lib/supabaseClient';

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes_count || 0);
  
  const handleLike = () => {
    if (liked) {
      setLikeCount(prev => prev - 1);
    } else {
      setLikeCount(prev => prev + 1);
    }
    setLiked(!liked);
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
            <Avatar>
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
      
      <CardContent className="p-4 pt-2">
        <p className="mb-3">{post.content || '内容がありません'}</p>
        
        {postImageUrl && (
          <div className="relative rounded-md overflow-hidden mb-3">
            <img 
              src={postImageUrl} 
              alt="投稿画像" 
              className="w-full h-48 object-cover"
            />
            
            {post.discount_rate !== undefined && post.discount_rate !== null && (
              <motion.div
                className="absolute top-2 right-2"
                variants={discountBadgeVariants}
                initial="initial"
                animate="animate"
              >
                <Badge className="bg-accent text-white font-bold text-lg px-2 py-1">
                  {post.discount_rate}% OFF
                </Badge>
              </motion.div>
            )}
          </div>
        )}
        
        <div className="flex items-center space-x-2 text-sm">
          {post.expires_at && (
            <Badge variant="outline" className="bg-accent/10 text-accent">
              {formatDistanceToNow(new Date(post.expires_at), { locale: ja, addSuffix: true })}まで
            </Badge>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="p-2 border-t flex justify-between">
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn(liked ? "text-accent" : "text-muted-foreground")}
          onClick={handleLike}
        >
          <ThumbsUp className="h-4 w-4 mr-1" />
          <span>{likeCount}</span>
        </Button>
        
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <MessageCircle className="h-4 w-4 mr-1" />
          <span>0</span>
        </Button>
        
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <Share2 className="h-4 w-4 mr-1" />
          <span>共有</span>
        </Button>
      </CardFooter>
    </Card>
  );
}