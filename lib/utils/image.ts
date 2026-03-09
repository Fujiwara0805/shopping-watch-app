/**
 * Cloudinary 画像URL最適化ユーティリティ
 * マップ、LP、イベント一覧・詳細など全画面で共有
 */

interface OptimizeOptions {
  width?: number;
  height?: number;
  crop?: 'fill' | 'limit' | 'fit' | 'scale';
  gravity?: 'auto' | 'face' | 'center';
  quality?: 'auto' | 'auto:best' | 'auto:good' | 'auto:eco' | 'auto:low';
  format?: 'auto' | 'webp' | 'avif';
}

/**
 * Cloudinary URLに変換パラメータを付与して最適化する
 * - 既に変換パラメータがある場合はスキップ
 * - Cloudinary以外のURLはそのまま返す
 */
export const optimizeCloudinaryUrl = (url: string, options: OptimizeOptions = {}): string => {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;
  // 既に最適化済みの場合はスキップ
  if (url.includes('q_auto') || url.includes('q_')) return url;

  const uploadIndex = url.indexOf('/upload/');
  if (uploadIndex === -1) return url;

  const beforeUpload = url.substring(0, uploadIndex + '/upload/'.length);
  const afterUpload = url.substring(uploadIndex + '/upload/'.length);

  const {
    width,
    height,
    crop = 'fill',
    gravity = 'auto',
    quality = 'auto',
    format = 'auto',
  } = options;

  const parts: string[] = [];
  if (width) parts.push(`w_${width}`);
  if (height) parts.push(`h_${height}`);
  if (width || height) {
    parts.push(`c_${crop}`);
    if (crop === 'fill') parts.push(`g_${gravity}`);
  }
  parts.push(`q_${quality}`);
  parts.push(`f_${format}`);

  return `${beforeUpload}${parts.join(',')}/${afterUpload}`;
};

/**
 * 正方形のサムネイル用に最適化（マップマーカー、一覧サムネイルなど）
 */
export const optimizeThumbnail = (url: string, size: number): string => {
  return optimizeCloudinaryUrl(url, {
    width: size,
    height: size,
    crop: 'fill',
    gravity: 'auto',
  });
};

/**
 * 幅指定のレスポンシブ画像用に最適化（メイン画像など）
 */
export const optimizeResponsive = (url: string, maxWidth: number): string => {
  return optimizeCloudinaryUrl(url, {
    width: maxWidth,
    crop: 'limit',
  });
};
