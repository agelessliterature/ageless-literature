/**
 * Get the API base URL with proper formatting
 */
export function getApiUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/api\/?$/, '');
}
