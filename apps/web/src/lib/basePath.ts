/**
 * Base path for the application.
 * In production, the app runs behind Apache reverse proxy at /v2.
 * In development, the app runs at root /.
 *
 * Use this for:
 * - Next.js Image component src attributes (standalone mode doesn't auto-prefix)
 * - Raw <img> tags and CSS background-image URLs
 * - Any static asset references in client components
 *
 * Note: Next.js Link component and router automatically use basePath from next.config.js.
 */
export const BASE_PATH = process.env.NODE_ENV === 'production' ? '/v2' : '';

/**
 * Prefix a static asset path with the base path.
 * @param path - The asset path (e.g., '/ageless-literature-logo.svg')
 * @returns The prefixed path (e.g., '/v2/ageless-literature-logo.svg' in production)
 */
export function withAssetPrefix(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_PATH}${cleanPath}`;
}
