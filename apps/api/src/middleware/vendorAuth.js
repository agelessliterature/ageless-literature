/**
 * Vendor Authentication Middleware
 * Protects vendor routes by verifying user authentication and APPROVED/ACTIVE vendor status.
 * Uses JWT authentication and Sequelize Vendor model.
 * Returns 401 if not authenticated, 403 if not a vendor or vendor not approved.
 */

import jwt from 'jsonwebtoken';
import db from '../models/index.js';

export const vendorAuth = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Authentication token required.',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token - Use JWT_SECRET (backend tokens are signed with JWT_SECRET, not NEXTAUTH_SECRET)
    const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

    const decoded = jwt.verify(token, jwtSecret);

    // Get user from database (support both id and userId from JWT)
    const userId = decoded.id || decoded.userId || decoded.sub;
    const user = await db.User.findByPk(userId, {
      attributes: { exclude: ['passwordHash'] },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. User not found.',
      });
    }

    // Check if user account is active
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: `Forbidden. Account is ${user.status}.`,
      });
    }

    // Find vendor record for this user
    const vendor = await db.Vendor.findOne({
      where: { userId: user.id },
    });

    if (!vendor) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Vendor account not found. Please apply to become a vendor.',
      });
    }

    // Check vendor approval status - only 'approved' or 'active' vendors can access
    const allowedStatuses = ['approved', 'active'];
    if (!allowedStatuses.includes(vendor.status)) {
      // Provide specific messages based on vendor status
      let message = 'Forbidden. Vendor account access denied.';

      if (vendor.status === 'pending') {
        message = 'Forbidden. Vendor application is pending approval.';
      } else if (vendor.status === 'rejected') {
        message = vendor.rejectionReason
          ? `Forbidden. Vendor application was rejected: ${vendor.rejectionReason}`
          : 'Forbidden. Vendor application was rejected.';
      } else if (vendor.status === 'suspended') {
        message = 'Forbidden. Vendor account is suspended. Please contact support.';
      } else if (vendor.status === 'archived') {
        message = 'Forbidden. Vendor account is archived.';
      }

      return res.status(403).json({
        success: false,
        message: message,
        vendorStatus: vendor.status,
      });
    }

    // Attach both user and vendor to request object for controllers to use
    req.user = user;
    req.userId = user.id;
    req.vendor = vendor;
    req.vendorId = vendor.id;

    // Vendor is authenticated and approved
    next();
  } catch (error) {
    console.error('[VendorAuth] Error during authentication:', error.message);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token.',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Authentication token expired.',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication verification failed.',
      error: error.message,
    });
  }
};
