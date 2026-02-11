/**
 * Admin API Helper
 * Utility functions for making authenticated API calls to admin endpoints
 */

export interface FetchOptions extends RequestInit {
  token?: string;
}

/**
 * Create headers with authorization token
 */
export function createAuthHeaders(token?: string): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Make an authenticated fetch request to an admin endpoint
 */
export async function adminFetch(url: string, options: FetchOptions = {}) {
  const { token, ...fetchOptions } = options;

  const headers: HeadersInit = {
    ...createAuthHeaders(token),
    ...(fetchOptions.headers || {}),
  };

  return fetch(url, {
    ...fetchOptions,
    headers,
    credentials: 'include',
  });
}
