/**
 * Authentication Controller
 * Handles user registration, login, OAuth integration, and password reset
 */

import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import db from '../models/index.js';
import { passwordComplexityValidator } from '../utils/passwordValidation.js';
import { uploadOAuthProfileImage, deleteImage } from '../utils/cloudinary.js';

const { User } = db;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRATION = '30d';

/**
 * Register a new user
 * POST /api/auth/register
 */
export const register = [
  // Validation middleware
  body('email').isEmail().normalizeEmail({ gmail_remove_dots: false }).withMessage('Valid email is required'),
  body('password')
    .custom(passwordComplexityValidator())
    .withMessage('Password does not meet security requirements'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('phoneNumber').optional().trim(),
  body('language').optional().isIn(['en', 'es', 'fr', 'de']).withMessage('Invalid language'),

  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { email, password, firstName, lastName, phoneNumber, language } = req.body;

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists',
        });
      }

      // Create user (password will be hashed automatically in beforeCreate hook)
      const user = await User.create({
        email,
        password, // Virtual field that triggers hashing
        firstName,
        lastName,
        phoneNumber,
        defaultLanguage: language || 'en',
        provider: 'credentials',
        emailVerified: false,
        status: 'active', // Normal signups are immediately active
      });

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRATION },
      );

      // Return user data (password excluded by toJSON)
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: user.toJSON(),
          token,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: error.message,
      });
    }
  },
];

/**
 * Login user
 * POST /api/auth/login
 */
export const login = [
  // Validation middleware
  body('email').isEmail().normalizeEmail({ gmail_remove_dots: false }).withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),

  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { email, password } = req.body;

      // Find user by email
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      // Check if account is suspended
      if (user.status === 'suspended') {
        return res.status(403).json({
          success: false,
          message: 'Account has been suspended. Please contact support.',
        });
      }

      if (user.status === 'inactive') {
        return res.status(403).json({
          success: false,
          message: 'Account is inactive. Please verify your email.',
        });
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      // Update login timestamp
      await user.updateLoginTimestamp();

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRATION },
      );

      // Return user data
      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: user.toJSON(),
          token,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: error.message,
      });
    }
  },
];

/**
 * OAuth callback handler
 * POST /api/auth/oauth/callback
 */
export const oauthCallback = async (req, res) => {
  try {
    const { provider, providerId, email, name, image, emailVerified } = req.body;

    if (!provider || !providerId || !email) {
      return res.status(400).json({
        success: false,
        message: 'Missing required OAuth fields',
      });
    }

    // Check if user exists with this OAuth provider
    let user = await User.findByProviderId(provider, providerId);

    if (!user) {
      // Check if user exists with this email
      user = await User.findByEmail(email);

      if (user) {
        // Link OAuth account to existing user
        user.provider = provider;
        user.providerId = providerId;
        if (emailVerified) {
          user.emailVerified = true;
          user.emailVerifiedAt = new Date();
        }
        await user.save();
      } else {
        // Create new user from OAuth
        const names = name ? name.split(' ') : [];
        user = await User.create({
          email,
          firstName: names[0] || '',
          lastName: names.slice(1).join(' ') || '',
          name,
          provider,
          providerId,
          emailVerified: emailVerified || false,
          emailVerifiedAt: emailVerified ? new Date() : null,
          passwordHash: null, // OAuth users don't have passwords
        });
      }
    }

    // Upload OAuth profile image to Cloudinary (for new users or if image is missing)
    if (
      image &&
      (!user.profilePhotoUrl ||
        user.profilePhotoUrl.includes('googleusercontent.com') ||
        user.profilePhotoUrl.includes('appleid.apple.com'))
    ) {
      try {
        console.log(`[OAuth] Uploading profile image to Cloudinary for user ${user.id}`);

        // Delete old Cloudinary image if it exists
        if (user.profilePhotoPublicId) {
          try {
            await deleteImage(user.profilePhotoPublicId);
          } catch (deleteError) {
            console.warn('[OAuth] Failed to delete old profile image:', deleteError.message);
          }
        }

        // Upload new image from OAuth provider
        const uploadResult = await uploadOAuthProfileImage(image, user.id, provider);

        // Update user with Cloudinary URL
        user.profilePhotoUrl = uploadResult.secure_url;
        user.profilePhotoPublicId = uploadResult.publicId;
        user.image = uploadResult.secure_url; // Also update legacy image field
        await user.save();

        console.log(
          `[OAuth] Successfully uploaded profile image to Cloudinary: ${uploadResult.secure_url}`,
        );
      } catch (uploadError) {
        console.error('[OAuth] Failed to upload profile image to Cloudinary:', uploadError.message);
        // Continue with OAuth login even if image upload fails
        // Fall back to provider URL
        if (!user.image || user.image !== image) {
          user.image = image;
          await user.save();
        }
      }
    }

    // Update login timestamp
    await user.updateLoginTimestamp();

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION },
    );

    res.json({
      success: true,
      message: 'OAuth authentication successful',
      data: {
        user: user.toJSON(),
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'OAuth authentication failed',
      error: error.message,
    });
  }
};

/**
 * Get current user
 * GET /api/auth/me
 */
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      include: [
        { model: db.Vendor, as: 'vendorProfile' },
        // { model: db.CollectorProfile, as: 'collectorProfile' }, // Table doesn't exist yet
        { model: db.MembershipSubscription, as: 'subscription' },
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: {
        user: user.toJSON(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get user',
      error: error.message,
    });
  }
};

/**
 * Logout user
 * POST /api/auth/logout
 */
export const logout = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId);

    if (user) {
      await user.updateLogoutTimestamp();
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: error.message,
    });
  }
};

/**
 * Get online users (admin only)
 * GET /api/auth/online-users
 */
export const getOnlineUsers = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.',
      });
    }

    const onlineUsers = await User.getOnlineUsers();
    const totalUsers = await User.count({ where: { status: 'active' } });

    // Get recently offline users (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentlyOffline = await User.findAll({
      where: {
        isOnline: false,
        lastLogoutAt: { [db.Sequelize.Op.gte]: oneDayAgo },
        status: 'active',
      },
      attributes: { exclude: ['passwordHash'] },
      order: [['lastLogoutAt', 'DESC']],
      limit: 50,
    });

    res.json({
      success: true,
      data: {
        online: onlineUsers,
        recentlyOffline,
        totalUsers,
        onlineCount: onlineUsers.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve online users',
      error: error.message,
    });
  }
};

/**
 * Verify JWT token middleware
 */
export const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (process.env.NODE_ENV !== 'test') console.error('ERROR: No token or invalid format');
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (process.env.NODE_ENV !== 'test')
      console.error('ERROR: Token verification failed:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

/**
 * Require admin role middleware
 */
export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin role required.',
    });
  }
  next();
};

/**
 * Require vendor role middleware
 */
export const requireVendor = (req, res, next) => {
  if (req.user.role !== 'vendor' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Vendor role required.',
    });
  }
  next();
};
