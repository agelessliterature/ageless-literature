/**
 * NextAuth Type Extensions
 */
import 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    email: string;
    name: string;
    image?: string; // OAuth profile picture
    role: string;
    token: string;
    defaultLanguage?: string; // i18n: language-preference fix
    provider?: 'credentials' | 'google' | 'apple';
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
      defaultLanguage?: string; // i18n: language-preference fix
      provider?: string; // Auth provider
    };
    accessToken: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    accessToken: string;
    defaultLanguage?: string; // i18n: language-preference fix
    provider?: string;
  }
}
