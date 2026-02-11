/**
 * User Helper Utilities
 * Helper functions to interact with user data and check user status
 */

import api from './api';

/**
 * Get the current user with all associated data
 */
export const getCurrentUser = async () => {
  try {
    const response = await api.get('/api/users/me');
    if (response.data?.success) {
      return {
        success: true,
        user: response.data.data.user,
        isVendor: response.data.data.isVendor,
        isAdmin: response.data.data.isAdmin,
        hasMembership: response.data.data.hasMembership,
      };
    }
    return { success: false, user: null };
  } catch (error) {
    return { success: false, user: null };
  }
};

/**
 * Get user by ID
 */
export const getUserById = async (userId: string) => {
  try {
    const response = await api.get(`/api/users/${userId}`);
    if (response.data?.success) {
      return {
        success: true,
        user: response.data.data,
      };
    }
    return { success: false, user: null };
  } catch (error) {
    return { success: false, user: null };
  }
};

/**
 * Check if a user is a vendor
 */
export const isVendor = async (userId: string): Promise<boolean> => {
  try {
    const response = await api.get(`/api/users/${userId}/is-vendor`);
    return response.data?.data?.isVendor || false;
  } catch (error) {
    return false;
  }
};

/**
 * Check if a user is a member
 */
export const isMember = async (userId: string): Promise<boolean> => {
  try {
    const response = await api.get(`/api/users/${userId}/is-member`);
    return response.data?.data?.isMember || false;
  } catch (error) {
    return false;
  }
};

/**
 * Check if a user is an admin
 */
export const isAdmin = async (userId: string): Promise<boolean> => {
  try {
    const response = await api.get(`/api/users/${userId}/is-admin`);
    return response.data?.data?.isAdmin || false;
  } catch (error) {
    return false;
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (
  userId: string,
  data: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    image?: string;
    timezone?: string;
    currency?: string;
    emailNotifications?: boolean;
    marketingEmails?: boolean;
  },
) => {
  try {
    const response = await api.patch(`/api/users/${userId}`, data);
    if (response.data?.success) {
      return {
        success: true,
        user: response.data.data,
      };
    }
    return { success: false, message: response.data?.message };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to update profile',
    };
  }
};

/**
 * Update user password
 */
export const updatePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
) => {
  try {
    const response = await api.patch(`/api/users/${userId}/password`, {
      currentPassword,
      newPassword,
    });
    if (response.data?.success) {
      return { success: true, message: response.data.message };
    }
    return { success: false, message: response.data?.message };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to update password',
    };
  }
};

/**
 * Update user language preference
 */
export const updateLanguage = async (userId: string, language: 'en' | 'es' | 'fr' | 'de') => {
  try {
    const response = await api.patch(`/api/users/${userId}/language`, { language });
    if (response.data?.success) {
      return {
        success: true,
        user: response.data.data,
        message: response.data.message,
      };
    }
    return { success: false, message: response.data?.message };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to update language',
    };
  }
};

/**
 * Get user statistics
 */
export const getUserStats = async (userId: string) => {
  try {
    const response = await api.get(`/api/users/${userId}/stats`);
    if (response.data?.success) {
      return {
        success: true,
        stats: response.data.data,
      };
    }
    return { success: false, stats: null };
  } catch (error) {
    return { success: false, stats: null };
  }
};

/**
 * Delete user account (soft delete)
 */
export const deleteUserAccount = async (userId: string) => {
  try {
    const response = await api.delete(`/api/users/${userId}`);
    if (response.data?.success) {
      return { success: true, message: response.data.message };
    }
    return { success: false, message: response.data?.message };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to delete account',
    };
  }
};

/**
 * Register a new user
 */
export const registerUser = async (data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}) => {
  try {
    const response = await api.post('/api/auth/register', data);
    if (response.data?.success) {
      return {
        success: true,
        user: response.data.data.user,
        token: response.data.data.token,
      };
    }
    return { success: false, message: response.data?.message };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to register',
    };
  }
};

/**
 * Get online users (admin only)
 */
export const getOnlineUsers = async () => {
  try {
    const response = await api.get('/api/auth/online-users');
    if (response.data?.success) {
      return {
        success: true,
        online: response.data.data.online,
        recentlyOffline: response.data.data.recentlyOffline,
      };
    }
    return { success: false, online: [], recentlyOffline: [] };
  } catch (error) {
    return { success: false, online: [], recentlyOffline: [] };
  }
};
