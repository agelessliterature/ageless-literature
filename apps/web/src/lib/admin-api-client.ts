import axios from 'axios';

/**
 * Admin API client without session interceptors
 * Uses manual token injection to avoid Router update errors
 */

// Strip trailing /api from API URL to prevent double /api/api paths
const isServer = typeof window === 'undefined';

function getAdminBaseURL(): string {
  if (isServer) {
    if (process.env.INTERNAL_API_URL) return process.env.INTERNAL_API_URL.replace(/\/api\/?$/, '');
    if (process.env.API_URL) return process.env.API_URL.replace(/\/api\/?$/, '');
    return 'http://localhost:3001';
  }
  return '';
}

const baseURL = getAdminBaseURL();

const adminApi = axios.create({
  baseURL: `${baseURL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Simple response interceptor - Handle errors without navigation
adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // Just reject without navigation to avoid Router updates during render
    return Promise.reject(error);
  },
);

export default adminApi;
