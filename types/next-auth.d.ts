import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
      role?: string; // Add role to user object in session
    } & DefaultSession['user'];
  }

  interface User {
    role?: string; // Add role to user object
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
    providerAccountId?: string;
    provider?: string;
    role?: string; // Add role to JWT
  }
} 