/**
 * Admin Authentication Middleware
 * Protects admin routes by verifying user authentication and ADMIN role.
 * Uses JWT authentication and Sequelize User model.
 * Returns 401 if not authenticated, 403 if not admin role.
 */

import jwt from 'jsonwebtoken';
import db from '../models/index.js';

export const adminAuth = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[AdminAuth] No authorization header or invalid format');
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Authentication token required.',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    console.log('[AdminAuth] Token received, length:', token.length);

    // Verify JWT token - Use JWT_SECRET (backend tokens are signed with JWT_SECRET, not NEXTAUTH_SECRET)
    const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

    const decoded = jwt.verify(token, jwtSecret);
    console.log(
      '[AdminAuth] Token decoded successfully, user ID:',
      decoded.id || decoded.userId || decoded.sub,
    );

    // Get user from database (NextAuth uses 'id' field, not 'userId')
    const userId = decoded.id || decoded.userId || decoded.sub;
    const user = await db.User.findByPk(userId, {
      attributes: { exclude: ['passwordHash'] },
    });

    if (!user) {
      console.log('[AdminAuth] User not found in database for ID:', userId);
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. User not found.',
      });
    }

    // Check if user status is active
    if (user.status !== 'active') {
      console.log('[AdminAuth] User status is not active:', user.status);
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Account is not active.',
      });
    }

    // Check if user has admin role (case-insensitive)
    if (user.role?.toLowerCase() !== 'admin') {
      console.log('[AdminAuth] User does not have admin role:', user.role);
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Admin access required.',
      });
    }

    // Attach user to request object
    req.user = user;
    req.userId = user.id;

    console.log('[AdminAuth] Authentication successful for admin:', user.email);
    // User is authenticated and has admin role
    next();
  } catch (error) {
    console.error('[AdminAuth] Error during authentication:', error.message);

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
