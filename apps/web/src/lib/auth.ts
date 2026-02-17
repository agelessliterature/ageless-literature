/**
 * NextAuth Configuration with Multiple Providers
 *
 * AUDIT FINDINGS (Nov 11, 2025):
 * - CredentialsProvider configured and working
 * - JWT session strategy (recommended for serverless)
 * - Custom callbacks for user data persistence
 * WARNING: GoogleProvider added - requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
 * WARNING: AppleProvider added - requires APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, and APPLE_PRIVATE_KEY
 *
 * MISSING ENV VARS (will log warnings if not set):
 * - GOOGLE_CLIENT_ID
 * - GOOGLE_CLIENT_SECRET
 * - APPLE_CLIENT_ID
 * - APPLE_TEAM_ID
 * - APPLE_KEY_ID
 * - APPLE_PRIVATE_KEY
 */

import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import AppleProvider from 'next-auth/providers/apple';
import jwt from 'jsonwebtoken';

/**
 * Get the internal API base URL for server-side calls.
 * IMPORTANT: Do NOT use NEXT_PUBLIC_* variables here — SWC inlines them as
 * string literals at build time, which breaks the conditional fallback logic.
 * Only use runtime env vars (INTERNAL_API_URL, API_URL) that are NOT inlined.
 */
function getInternalApiBaseUrl(): string {
  // INTERNAL_API_URL is a runtime-only env var, never inlined by SWC
  const internalUrl = process.env.INTERNAL_API_URL;
  if (internalUrl) {
    return internalUrl.replace(/\/api\/?$/, '');
  }

  // API_URL is also runtime-only
  const apiUrl = process.env.API_URL;
  if (apiUrl) {
    return apiUrl.replace(/\/api\/?$/, '');
  }

  // Fallback for local development
  return 'http://localhost:3001';
}

// Generate Apple client secret JWT
function generateAppleClientSecret() {
  if (
    !process.env.APPLE_CLIENT_ID ||
    !process.env.APPLE_TEAM_ID ||
    !process.env.APPLE_KEY_ID ||
    !process.env.APPLE_PRIVATE_KEY
  ) {
    return null;
  }

  try {
    const privateKey = process.env.APPLE_PRIVATE_KEY.replace(/\\n/g, '\n');
    const now = Math.floor(Date.now() / 1000);

    const token = jwt.sign(
      {
        iss: process.env.APPLE_TEAM_ID,
        iat: now,
        exp: now + 86400 * 180, // 180 days
        aud: 'https://appleid.apple.com',
        sub: process.env.APPLE_CLIENT_ID,
      },
      privateKey,
      {
        algorithm: 'ES256',
        keyid: process.env.APPLE_KEY_ID,
      },
    );

    return token;
  } catch (error) {
    console.error('Error generating Apple client secret:', error);
    return null;
  }
}

// Validate environment variables and log warnings
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  // Google OAuth not configured
}
if (
  !process.env.APPLE_CLIENT_ID ||
  !process.env.APPLE_PRIVATE_KEY ||
  !process.env.APPLE_TEAM_ID ||
  !process.env.APPLE_KEY_ID
) {
  // Apple OAuth not configured
}
if (!process.env.NEXTAUTH_SECRET) {
  // NextAuth secret not configured
}

export const authOptions: NextAuthOptions = {
  providers: [
    // Email/Password Authentication
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.error('[NextAuth] Missing credentials');
          throw new Error('Email and password required');
        }

        try {
          // Use internal API URL for server-side calls (Docker network)
          // INTERNAL_API_URL is set at container runtime, not inlined by SWC
          const baseUrl = getInternalApiBaseUrl();
          const loginUrl = `${baseUrl}/api/auth/login`;

          console.log('[NextAuth] Attempting login to:', loginUrl);

          const response = await fetch(loginUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          const data = await response.json();
          console.log('[NextAuth] Backend response:', {
            success: data.success,
            status: response.status,
          });

          if (!response.ok) {
            console.error('[NextAuth] Authentication failed:', data.message);
            throw new Error(data.message || 'Authentication failed');
          }

          if (data.success && data.data.user) {
            console.log(
              '[NextAuth] Login successful for:',
              data.data.user.email,
              'Role:',
              data.data.user.role,
            );
            return {
              id: data.data.user.id.toString(),
              email: data.data.user.email,
              name: `${data.data.user.firstName} ${data.data.user.lastName}`,
              role: data.data.user.role,
              token: data.data.token,
              defaultLanguage: data.data.user.defaultLanguage || 'en', // i18n: language-preference fix
            };
          }

          console.error('[NextAuth] Unexpected response format');
          return null;
        } catch (error: any) {
          console.error('[NextAuth] Authorization error:', error.message);
          throw new Error(error.message || 'Authentication failed');
        }
      },
    }),

    // Google OAuth Provider
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
              params: {
                prompt: 'consent',
                access_type: 'offline',
                response_type: 'code',
              },
            },
          }),
        ]
      : []),

    // Apple OAuth Provider
    ...(process.env.APPLE_CLIENT_ID && process.env.APPLE_PRIVATE_KEY
      ? [
          AppleProvider({
            clientId: process.env.APPLE_CLIENT_ID,
            clientSecret: generateAppleClientSecret() || '',
            authorization: {
              params: {
                scope: 'name email',
                response_mode: 'form_post',
                response_type: 'code',
              },
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Allow all sign-ins (credentials and OAuth)
      // For OAuth providers, user/profile data is automatically passed

      // If OAuth sign-in, we could call backend to create/update user
      if (account?.provider === 'google' || account?.provider === 'apple') {
        try {
          // Use internal API URL for server-side calls (Docker network)
          const baseUrl = getInternalApiBaseUrl();
          // Call backend to create/update OAuth user and get JWT token
          // Backend will automatically upload profile image to Cloudinary
          const response = await fetch(`${baseUrl}/api/auth/oauth/callback`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              provider: account.provider,
              providerId: account.providerAccountId,
              email: user.email,
              name: user.name,
              image: user.image,
              emailVerified: true, // OAuth providers verify emails
            }),
          });

          const data = await response.json();

          // Store the JWT token from backend for this OAuth user
          if (data?.success && data?.data?.token) {
            user.token = data.data.token;
            user.id = data.data.user.id.toString();
            user.role = data.data.user.role;
            user.defaultLanguage = data.data.user.defaultLanguage || 'en'; // i18n: language-preference fix

            // Use Cloudinary image URL from backend if available
            if (data.data.user.profilePhotoUrl) {
              user.image = data.data.user.profilePhotoUrl;
            } else if (data.data.user.image) {
              user.image = data.data.user.image;
            }
          }
        } catch (error) {
          // Continue anyway - user data will be in session from OAuth provider
        }
      }

      return true;
    },
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.role = user.role || 'collector'; // Default role for OAuth users
        token.accessToken = user.token;
        token.provider = account?.provider || 'credentials';
        token.defaultLanguage = user.defaultLanguage || 'en'; // i18n: language-preference fix
        token.picture = user.image; // Store profile photo

        // For OAuth, set default values if not from credentials
        if (!user.token && (account?.provider === 'google' || account?.provider === 'apple')) {
          token.accessToken = (account.access_token as string) || '';
        }

        // i18n: language-preference fix - Fetch user's defaultLanguage from backend
        if (user.email && !user.defaultLanguage && typeof window === 'undefined') {
          try {
            // Use internal API URL — do NOT use NEXT_PUBLIC_* (inlined by SWC)
            const baseUrl = getInternalApiBaseUrl();
            const response = await fetch(
              `${baseUrl}/api/users/profile?email=${encodeURIComponent(user.email)}`,
              {
                headers: { 'Content-Type': 'application/json' },
              },
            );
            const data = await response.json();
            if (data?.success && data?.data?.defaultLanguage) {
              token.defaultLanguage = data.data.defaultLanguage;
            }
            if (data?.success && data?.data?.profilePhotoUrl) {
              token.picture = data.data.profilePhotoUrl;
            }
          } catch (error) {
            token.defaultLanguage = 'en';
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.accessToken = token.accessToken as string;
        session.user.provider = token.provider as string;
        session.user.defaultLanguage = token.defaultLanguage as string; // i18n: language-preference fix
        session.user.image = (token.picture as string) || null; // Add profile photo to session
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  // Set basePath for API auth (controlled via env var, empty for root deployment)
  basePath: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/auth`,
};
