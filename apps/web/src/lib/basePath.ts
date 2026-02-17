/**
 * Base path for the application.
 * Controlled via NEXT_PUBLIC_BASE_PATH env var.
 * Default is '' (root). Set to '/v2' only for legacy servers.
 *
 * Use this for:
 * - Next.js Image component src attributes (standalone mode doesn't auto-prefix)
 * - Raw <img> tags and CSS background-image URLs
 * - Any static asset references in client components
 *
 * Note: Next.js Link component and router automatically use basePath from next.config.js.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

/**
 * Prefix a static asset path with the base path.
 * @param path - The asset path (e.g., '/ageless-literature-logo.svg')
 * @returns The prefixed path (e.g., '/ageless-literature-logo.svg' or '/v2/ageless-literature-logo.svg' if basePath is set)
 */
export function withAssetPrefix(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_PATH}${cleanPath}`;
}
