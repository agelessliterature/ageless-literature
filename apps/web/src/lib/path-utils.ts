/**
 * Path utilities - basePath is now always empty for local development
 * Production deployments should handle routing at server level
 */

export const isDevServer = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    !window.location.hostname.includes('localhost') &&
    !window.location.hostname.includes('127.0.0.1')
  );
};

export const getBasePath = (): string => {
  // Always return empty - no basePath in development
  return '';
};

export const getAuthBasePath = (): string => {
  return '/api/auth';
};

export const withBasePath = (path: string): string => {
  const basePath = getBasePath();
  const cleanPath = path.startsWith('/') ? path : '/' + path;
  return basePath ? basePath + cleanPath : cleanPath;
};
