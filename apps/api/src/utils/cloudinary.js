/**
 * Cloudinary Utility Functions
 * Handles image uploads, deletions, and signature generation
 */

import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dvohtcqvi',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Generate upload signature for client-side uploads
 * @param {Object} params - Upload parameters to sign
 * @returns {Object} - Signature, timestamp, and other required data
 */
export const generateUploadSignature = (params = {}) => {
  const timestamp = Math.round(new Date().getTime() / 1000);

  const paramsToSign = {
    timestamp,
    ...params,
  };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET,
  );

  return {
    signature,
    timestamp,
    api_key: process.env.CLOUDINARY_API_KEY,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  };
};

/**
 * Delete an image from Cloudinary
 * @param {string} publicId - The public ID of the image to delete
 * @returns {Promise<Object>} - Deletion result
 */
export const deleteImage = async (publicId) => {
  if (!publicId) {
    throw new Error('Public ID is required for deletion');
  }

  const result = await cloudinary.uploader.destroy(publicId);
  return result;
};

/**
 * Get optimized Cloudinary URL with transformations
 * @param {string} publicId - The public ID of the image
 * @param {Object} options - Transformation options
 * @returns {string} - Optimized Cloudinary URL
 */
export const getOptimizedUrl = (publicId, options = {}) => {
  if (!publicId) return null;

  const defaultOptions = {
    fetch_format: 'auto',
    quality: 'auto',
    ...options,
  };

  return cloudinary.url(publicId, defaultOptions);
};

/**
 * Generate folder path for user images
 * @param {string} userId - User ID
 * @param {string} type - Image type (profile, banner)
 * @returns {string} - Folder path
 */
export const getUserImageFolder = (userId, type = 'profile') => {
  return `users/${userId}/${type}`;
};

/**
 * Generate folder path for vendor images
 * @param {string} vendorId - Vendor ID
 * @param {string} type - Image type (logo, banner)
 * @returns {string} - Folder path
 */
export const getVendorImageFolder = (vendorId, type = 'logo') => {
  return `vendors/${vendorId}/${type}`;
};

/**
 * Build optimized image transformation URL
 * @param {string} url - Original Cloudinary URL
 * @param {Object} transformations - Transformation options
 * @returns {string} - Transformed URL
 */
export const buildTransformationUrl = (url, transformations = {}) => {
  if (!url) return null;

  // Extract public_id from URL
  const matches = url.match(/\/v\d+\/(.+)\.\w+$/);
  if (!matches) return url;

  const publicId = matches[1];
  return getOptimizedUrl(publicId, transformations);
};

/**
 * Upload OAuth profile image from external URL to Cloudinary
 * @param {string} imageUrl - External image URL from OAuth provider (Google, Apple, etc.)
 * @param {string} userId - User ID for folder organization
 * @param {string} provider - OAuth provider name (google, apple)
 * @returns {Promise<Object>} - { url, publicId, secure_url }
 */
export const uploadOAuthProfileImage = async (imageUrl, userId, provider) => {
  if (!imageUrl || !userId) {
    throw new Error('Image URL and User ID are required');
  }

  try {
    const folder = getUserImageFolder(userId, 'profile');
    const publicId = `${folder}/oauth_${provider}_${Date.now()}`;

    // Upload from external URL to Cloudinary
    const result = await cloudinary.uploader.upload(imageUrl, {
      public_id: publicId,
      overwrite: true,
      folder: folder,
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
      // Add headers to avoid blocking by OAuth providers
      context: `provider=${provider}|userId=${userId}`,
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      secure_url: result.secure_url,
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    console.error('[Cloudinary] OAuth image upload failed:', error.message);
    throw new Error(`Failed to upload OAuth profile image: ${error.message}`);
  }
};

export default cloudinary;
