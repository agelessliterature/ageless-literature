/**
 * Cloudinary API Client
 * Frontend helper functions for interacting with Cloudinary backend API
 */

import api from './api';

export interface UploadResult {
  url: string;
  publicId: string;
}

/**
 * Update user profile image
 */
export const updateUserProfileImage = async (data: UploadResult) => {
  const response = await api.post('/cloudinary/user/profile-image', data);
  return response.data;
};

/**
 * Update vendor logo
 */
export const updateVendorLogo = async (data: UploadResult) => {
  const response = await api.post('/cloudinary/vendor/logo', data);
  return response.data;
};

/**
 * Update vendor banner
 */
export const updateVendorBanner = async (data: UploadResult) => {
  const response = await api.post('/cloudinary/vendor/banner', data);
  return response.data;
};

/**
 * Delete an image from Cloudinary
 */
export const deleteCloudinaryImage = async (publicId: string) => {
  const response = await api.post('/cloudinary/delete', { publicId });
  return response.data;
};

/**
 * Get upload signature for signed uploads (if needed in future)
 */
export const getUploadSignature = async (params: any = {}) => {
  const response = await api.post('/cloudinary/signature', params);
  return response.data;
};
