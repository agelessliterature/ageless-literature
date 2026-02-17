/**
 * Get the API base URL with proper formatting
 * Server-side: use runtime INTERNAL_API_URL or API_URL
 * Client-side: empty string (relative, proxied via Next.js rewrites)
 */
export function getApiUrl(): string {
  if (typeof window === 'undefined') {
    const url = process.env.INTERNAL_API_URL || process.env.API_URL || 'http://localhost:3001';
    return url.replace(/\/api\/?$/, '');
  }
  return '';
}
