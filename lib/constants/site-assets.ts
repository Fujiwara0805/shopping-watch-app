const CLOUDINARY_ICON_PATH = 'v1782729433/1871f54a-68d4-4729-952b-9fa25484c9b2_vdt8ks.png';
const CLOUDINARY_UPLOAD_BASE = 'https://res.cloudinary.com/dz9trbwma/image/upload';

const cloudinaryIconUrl = (transformation: string) =>
  `${CLOUDINARY_UPLOAD_BASE}/${transformation}/${CLOUDINARY_ICON_PATH}`;

export const SITE_ICON_32 = cloudinaryIconUrl('q_auto,w_32,h_32,c_fill,g_auto');
export const SITE_ICON_64 = cloudinaryIconUrl('f_auto,q_auto,w_64,h_64,c_fill,g_auto');
export const SITE_ICON_180 = cloudinaryIconUrl('q_auto,w_180,h_180,c_fill,g_auto');
export const SITE_ICON_192 = cloudinaryIconUrl('q_auto,w_192,h_192,c_fill,g_auto');
export const SITE_ICON_512 = cloudinaryIconUrl('q_auto,w_512,h_512,c_fill,g_auto');
export const SITE_OG_IMAGE = cloudinaryIconUrl('f_auto,q_auto,w_1200,h_630,c_pad,b_white');
