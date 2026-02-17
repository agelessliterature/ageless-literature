/**
 * Upload Routes
 * Handles direct file uploads to Cloudinary for NativeImageUploader
 * Enforces authentication, file type validation, and size limits
 */

import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { verifyToken } from '../controllers/authController.js';

const router = express.Router();

// Configure Cloudinary (should already be configured in utils, but ensuring it's set)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Configure multer for memory storage (don't write to disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (_req, file, cb) => {
    // Strict allowlist: only common image formats
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(`Invalid file type. Only JPG, PNG, and WebP are allowed. Got: ${file.mimetype}`),
      );
    }
  },
});

/**
 * POST /api/upload
 * Upload image to Cloudinary
 * Requires authentication
 * Body: multipart/form-data with fields:
 *   - file: image file
 *   - vendorId: vendor ID (required)
 *   - productType: 'book' | 'product' (optional, default: 'product')
 */
router.post('/', verifyToken, upload.single('file'), async (req, res) => {
  try {
    // Validate file exists
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    // Validate required fields
    const { vendorId } = req.body;

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: 'vendorId is required',
      });
    }

    // Sanitize inputs
    const sanitizedVendorId = String(vendorId).replace(/[^a-zA-Z0-9_-]/g, '');
    const sanitizedProductType = 'product';

    // Build folder path: products/{vendorId} or books/{vendorId}
    const folderPrefix = sanitizedProductType === 'book' ? 'books' : 'products';
    const folder = `${folderPrefix}/${sanitizedVendorId}`;

    // Upload to Cloudinary using upload_stream (no disk writes)
    const uploadPromise = new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          resource_type: 'image',
          transformation: [
            { width: 1200, height: 1200, crop: 'limit' },
            { quality: 'auto:good' },
            { fetch_format: 'auto' },
          ],
          // Generate thumbnail
          eager: [{ width: 300, height: 300, crop: 'fill', quality: 'auto:low' }],
        },
        (error, result) => {
          if (error) {
            console.error('[Upload] Cloudinary error:', error);
            reject(error);
          } else {
            resolve(result);
          }
        },
      );

      // Pipe the buffer to Cloudinary
      uploadStream.end(req.file.buffer);
    });

    const result = await uploadPromise;

    // Return response matching frontend expectations
    return res.status(200).json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      thumbnail: result.eager && result.eager[0] ? result.eager[0].secure_url : result.secure_url,
    });
  } catch (error) {
    console.error('[Upload] Error:', error);

    // Handle multer file size errors
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.',
      });
    }

    // Handle file type errors
    if (error.message && error.message.includes('Invalid file type')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Upload failed',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
});

/**
 * DELETE /api/upload
 * Delete image from Cloudinary
 * Requires authentication
 * Query params:
 *   - publicId: Cloudinary public ID (required)
 *   - productType: 'book' | 'product' (optional, for logging)
 */
router.delete('/', verifyToken, async (req, res) => {
  try {
    const { publicId } = req.query;

    // Validate publicId
    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'publicId is required',
      });
    }

    // Basic authorization: ensure publicId contains products/ or books/ prefix
    // This prevents deleting arbitrary images
    const allowedPrefixes = ['products/', 'books/', 'vendors/'];
    const hasValidPrefix = allowedPrefixes.some((prefix) => String(publicId).startsWith(prefix));

    if (!hasValidPrefix) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Can only delete product, book, or vendor images.',
      });
    }

    // Optional: Add stricter vendor-level authorization here if needed
    // For now, any authenticated user can delete (assumes frontend only shows their images)

    // Delete from Cloudinary
    const result = await cloudinary.uploader.destroy(String(publicId));

    // Cloudinary returns result: 'ok', 'not found', or error
    if (result.result === 'ok' || result.result === 'not found') {
      return res.status(200).json({
        success: true,
        message:
          result.result === 'ok'
            ? 'Image deleted successfully'
            : 'Image not found (may have been deleted already)',
      });
    }

    // Unexpected result
    return res.status(500).json({
      success: false,
      message: 'Failed to delete image',
      result,
    });
  } catch (error) {
    console.error('[Upload Delete] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Delete failed',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
});

export default router;
