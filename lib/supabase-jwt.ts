import jwt from 'jsonwebtoken';

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

const DEFAULT_TTL_SECONDS = 60 * 60;

export function signSupabaseJwt(
  userId: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): string | null {
  if (!SUPABASE_JWT_SECRET) {
    return null;
  }
  return jwt.sign(
    {
      sub: userId,
      role: 'authenticated',
      aud: 'authenticated',
    },
    SUPABASE_JWT_SECRET,
    { algorithm: 'HS256', expiresIn: ttlSeconds }
  );
}
