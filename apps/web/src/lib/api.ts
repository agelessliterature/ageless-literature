import axios from 'axios';
import { getSession } from 'next-auth/react';

// Ensure baseURL includes /api path
const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const apiBaseURL = baseURL.endsWith('/api') ? baseURL : `${baseURL}/api`;

// Helper function for client-side routes - returns full API URL
export function getApiUrl(path: string): string {
  // Remove leading slash if present to make it consistent
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  // Remove 'api/' prefix if present since apiBaseURL already includes it
  const pathWithoutApi = cleanPath.startsWith('api/') ? cleanPath.slice(4) : cleanPath;
  return `${apiBaseURL}/${pathWithoutApi}`;
}

// Helper to get URL for static assets
export function getAssetUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return cleanPath;
}

const api = axios.create({
  baseURL: apiBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  async (config) => {
    // Try to get NextAuth session token first (client-side only)
    if (typeof window !== 'undefined') {
      try {
        const session = await getSession();

        if (session?.accessToken) {
          config.headers.Authorization = `Bearer ${session.accessToken}`;
        }
        // Remove fallback to localStorage to prevent using expired tokens
        // If there's no session, the request will proceed without auth
      } catch (error) {
        console.error('ERROR: Error getting session:', error);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - log but don't auto-redirect to prevent loops
      console.warn('WARNING: 401 Unauthorized - Token may be expired or invalid');
      // Let the component handle authentication state
    }
    return Promise.reject(error);
  },
);

export default api;
