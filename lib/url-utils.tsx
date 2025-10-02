import { Globe } from 'lucide-react';
import React from 'react';

export type SocialPlatform = 'instagram' | 'twitter' | 'facebook' | 'other';

// カスタム画像アイコンコンポーネント
const CustomImageIcon = ({ src, alt, className }: { src: string; alt: string; className?: string }) => (
  <img 
    src={src} 
    alt={alt} 
    className={className || "h-4 w-4"} 
    style={{ objectFit: 'contain' }}
  />
);

export interface UrlInfo {
  platform: SocialPlatform;
  icon: React.ComponentType<{ className?: string }>;
  displayName: string;
  color: string;
  bgColor: string;
}

/**
 * URLを解析してソーシャルプラットフォームを判定する
 */
export function detectSocialPlatform(url: string): SocialPlatform {
  if (!url) return 'other';
  
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Instagram
    if (hostname.includes('instagram.com') || hostname.includes('instagr.am')) {
      return 'instagram';
    }
    
    // X (旧Twitter)
    if (hostname.includes('twitter.com') || hostname.includes('x.com') || hostname.includes('t.co')) {
      return 'twitter';
    }
    
    // Facebook
    if (hostname.includes('facebook.com') || hostname.includes('fb.com') || hostname.includes('fb.me')) {
      return 'facebook';
    }
    
    return 'other';
  } catch (error) {
    // 無効なURLの場合
    return 'other';
  }
}

/**
 * プラットフォームに応じたアイコン情報を取得する
 */
export function getUrlInfo(url: string): UrlInfo {
  const platform = detectSocialPlatform(url);
  
  switch (platform) {
    case 'instagram':
      return {
        platform: 'instagram',
        icon: ({ className }) => (
          <CustomImageIcon 
            src="https://res.cloudinary.com/dz9trbwma/image/upload/v1759308496/icons8-%E3%82%A4%E3%83%B3%E3%82%B9%E3%82%BF%E3%82%AF%E3%82%99%E3%83%A9%E3%83%A0-100_idedfz.png"
            alt="Instagram"
            className={className}
          />
        ),
        displayName: 'Instagram',
        color: 'text-pink-600',
        bgColor: 'bg-pink-50 hover:bg-pink-100'
      };
    
    case 'twitter':
      return {
        platform: 'twitter',
        icon: ({ className }) => (
          <CustomImageIcon 
            src="https://res.cloudinary.com/dz9trbwma/image/upload/v1759308507/icons8-%E3%83%84%E3%82%A4%E3%83%83%E3%82%BF%E3%83%BCx-100_x18dc0.png"
            alt="X (旧Twitter)"
            className={className}
          />
        ),
        displayName: 'X (旧Twitter)',
        color: 'text-black',
        bgColor: 'bg-gray-50 hover:bg-gray-100'
      };
    
    case 'facebook':
      return {
        platform: 'facebook',
        icon: ({ className }) => (
          <CustomImageIcon 
            src="https://res.cloudinary.com/dz9trbwma/image/upload/v1759308615/icons8-facebook%E3%81%AE%E6%96%B0%E3%81%97%E3%81%84-100_2_pps86o.png"
            alt="Facebook"
            className={className}
          />
        ),
        displayName: 'Facebook',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50 hover:bg-blue-100'
      };
    
    default:
      return {
        platform: 'other',
        icon: ({ className }) => (
          <CustomImageIcon 
            src="https://res.cloudinary.com/dz9trbwma/image/upload/v1759366399/icons8-%E3%82%A6%E3%82%A7%E3%83%95%E3%82%99-100_a6uwwq.png"
            alt="Webサイト"
            className={className}
          />
        ),
        displayName: 'Webサイト',
        color: 'text-gray-600',
        bgColor: 'bg-gray-50 hover:bg-gray-100'
      };
  }
}

/**
 * URLの表示用短縮版を生成する
 */
export function getDisplayUrl(url: string, maxLength: number = 30): string {
  if (!url) return '';
  
  try {
    const urlObj = new URL(url);
    let displayUrl = urlObj.hostname;
    
    if (urlObj.pathname !== '/') {
      displayUrl += urlObj.pathname;
    }
    
    if (displayUrl.length > maxLength) {
      return displayUrl.substring(0, maxLength - 3) + '...';
    }
    
    return displayUrl;
  } catch (error) {
    // 無効なURLの場合はそのまま返す（短縮）
    if (url.length > maxLength) {
      return url.substring(0, maxLength - 3) + '...';
    }
    return url;
  }
}
