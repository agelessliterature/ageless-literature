/**
 * OAuth Provider Configuration
 * Check which OAuth providers are enabled
 */

export const isGoogleEnabled = !!(
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID
);

export const isAppleEnabled = !!(
  process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || process.env.APPLE_CLIENT_ID
);

export const availableOAuthProviders = {
  google: isGoogleEnabled,
  apple: isAppleEnabled,
};
