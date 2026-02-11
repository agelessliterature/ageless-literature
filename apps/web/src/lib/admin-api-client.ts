import axios from 'axios';

/**
 * Admin API client without session interceptors
 * Uses manual token injection to avoid Router update errors
 */

// Strip trailing /api from NEXT_PUBLIC_API_URL to prevent double /api/api paths
const baseURL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(
  /\/api\/?$/,
  '',
);

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
