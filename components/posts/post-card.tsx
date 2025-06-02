"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Heart, Share2, Clock, Link as LinkIcon, ExternalLink, Instagram, Copy, Laugh, Smile, Meh, Frown, Angry } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { PostWithAuthor } from '@/types/post';
import { supabase } from '@/lib/supabaseClient';
import { CustomModal } from '@/components/ui/custom-modal';
import { useToast } from '@/hooks/use-toast';
import React from 'react';

const discountIcons = [
  { value: 0, Icon: Angry, label: "0%" },
  { value: 20, Icon: Frown, label: "20~40%" },
  { value: 40, Icon: Meh, label: "40~60%" },
  { value: 60, Icon: Smile, label: "60~80%" },
  { value: 80, Icon: Laugh, label: "80~100%" },
];

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
  const [showShareDialog, setShowShareDialog] = useState(false);
  const { toast } = useToast();

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

  const postImageUrl = post.image_url;

  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: `✅ ${message}`,
        duration: 2000,
      });
      setShowShareDialog(false);
    }).catch(err => console.error("コピー失敗:", err));
  };

  const handleCopyStoreName = () => {
    if (post.store_name) {
      copyToClipboard(post.store_name, `「${post.store_name}」をコピーしました！`);
    }
  };

  const handleInstagramShare = () => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    copyToClipboard(postUrl, "投稿のリンクをコピーしました。Instagramアプリを開いて共有してください。");
    setShowShareDialog(false);
  };

  const handleNativeShare = async () => {
    const shareData = {
      title: `${post.store_name}の${post.category}がお得！`,
      text: post.content,
      url: `${window.location.origin}/post/${post.id}`,
    };
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        setShowShareDialog(false);
      } catch (error) {
        console.error('ネイティブ共有失敗:', error);
      }
    } else {
      console.warn('ネイティブ共有APIが利用できません、またはこのデータを共有できません。');
      copyToClipboard(shareData.url, "リンクをコピーしました！");
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-3 pb-1 space-y-0">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-2">
            <Avatar className="h-7 w-7">
              <AvatarImage src={authorAvatarUrl || undefined} alt={post.author?.display_name || '投稿者'} />
              <AvatarFallback className="text-xs">{post.author?.display_name?.charAt(0) || '?'}</AvatarFallback>
            </Avatar>
            <p className="font-semibold text-base text-foreground">{post.author?.display_name || '不明な投稿者'}</p>
          </div>
          
          <Badge className={cn("ml-auto text-sm", getCategoryColor(post.category || ''))}>
            {post.category || '不明'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-3 pt-1 flex flex-col h-full">
        <div className="flex-grow overflow-hidden" style={{ flexBasis: '50%', marginBottom: '0.75rem' }}>
          <p className="text-lg text-muted-foreground whitespace-pre-line line-clamp-3">{post.content || '内容がありません'}</p>
        </div>
        
        {postImageUrl && (
          <div className="relative rounded-md overflow-hidden flex-grow" style={{ flexBasis: '50%' }}>
            <img 
              src={postImageUrl} 
              alt="投稿画像" 
              className="w-full h-full object-cover"
            />
            
            <div className="absolute top-2 left-2 flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="icon"
                className="bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
                onClick={handleLikeClick}
              >
                <Heart size={18} className={post.isLikedByCurrentUser ? "text-red-500 fill-red-500" : ""} />
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon"
                className="bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
                onClick={() => setShowShareDialog(true)}
              >
                <Share2 size={18} />
              </Button>

              {post.expires_at && (
                <div className="bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center space-x-1">
                  <Clock size={14} className="" />
                  <span>{formatRemainingTime(new Date(post.expires_at).getTime())}</span>
                </div>
              )}
            </div>
            
            <Button 
              variant="ghost"
              className="absolute bottom-1 left-1 bg-black/60 text-white text-lg font-bold px-3 py-1 rounded-md h-auto hover:bg-black/80 transition-colors flex items-center space-x-1"
              onClick={handleCopyStoreName}
            >
              <Copy size={16} />
              <span>{post.store_name || '店舗不明'}</span>
            </Button>

            <div className="absolute top-2 right-2 flex flex-col items-end space-y-1">
              {post.discount_rate != null && (
                <motion.div
                  variants={discountBadgeVariants}
                  initial="initial"
                  animate="animate"
                >
                  <Badge className="bg-primary text-primary-foreground font-bold text-lg px-2 py-1 shadow-sm flex items-center">
                    {(() => {
                      const selectedOption = discountIcons.find(option => option.value === post.discount_rate);
                      const displayIcon = selectedOption ? selectedOption.Icon : Angry;
                      const displayText = selectedOption ? selectedOption.label : "なし";

                      return (
                        <>
                          {React.createElement(displayIcon, { className: "h-6 w-6 mr-1" })}
                          {displayText}
                        </>
                      );
                    })()}
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
      
      <CustomModal
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        title="投稿を共有"
        description="このお得情報を友達に知らせよう！"
      >
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start text-left py-3 h-auto text-base"
            onClick={() => {
                copyToClipboard(`${window.location.origin}/post/${post.id}`, "リンクをコピーしました！");
            }}
          >
            <LinkIcon className="mr-2.5 h-5 w-5" />
            リンクをコピー
          </Button>
          <Button
            className="w-full justify-start text-left py-3 h-auto text-base bg-[#1DA1F2] hover:bg-[#1a91da] text-white"
            onClick={() => {
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${post.store_name}の${post.category}がお得！ ${post.content}`)}&url=${encodeURIComponent(`${window.location.origin}/post/${post.id}`)}`, '_blank');
                setShowShareDialog(false);
            }}
          >
            <svg className="mr-2.5 h-5 w-5 fill-current" viewBox="0 0 24 24" aria-hidden="true"><g><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></g></svg>
            X (Twitter) で共有
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start text-left py-3 h-auto text-base bg-[#E1306C] hover:bg-[#c92a5f] text-white"
            onClick={handleInstagramShare}
          >
            <Instagram className="mr-2.5 h-5 w-5" />
            Instagramで共有
          </Button>
        </div>
        <div className="mt-6 flex justify-end">
            <Button variant="ghost" onClick={() => setShowShareDialog(false)} className="text-base px-5 py-2.5 h-auto">閉じる</Button>
        </div>
      </CustomModal>
    </Card>
  );
}