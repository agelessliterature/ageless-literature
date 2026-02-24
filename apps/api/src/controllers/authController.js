/**
 * Authentication Controller
 * Handles user registration, login, OAuth integration, and password reset
 */

import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { body, validationResult } from 'express-validator';
import db from '../models/index.js';
import { passwordComplexityValidator } from '../utils/passwordValidation.js';
import { uploadOAuthProfileImage, deleteImage } from '../utils/cloudinary.js';
import { verifyLegacyPassword } from '../utils/legacyPassword.js';
import { isLegacyWindowOpen } from '../utils/legacyAuthWindow.js';

const { User, PasswordResetToken } = db;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRATION = process.env.JWT_EXPIRES_IN || '30d';

// JWT config validated at startup

/**
 * Register a new user
 * POST /api/auth/register
 */
export const register = [
  // Validation middleware
  body('email')
    .isEmail()
    .normalizeEmail({ gmail_remove_dots: false })
    .withMessage('Valid email is required'),
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
        // provider: 'credentials', // REMOVED: Virtual field, can't be set directly
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
      console.error('[Register] Registration error:', error);
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
  body('email')
    .isEmail()
    .normalizeEmail({ gmail_remove_dots: false })
    .withMessage('Valid email is required'),
  body('password').trim().notEmpty().withMessage('Password is required'),

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

      // Verify password — bcrypt first, then legacy WP hash if window is open
      let isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        if (isLegacyWindowOpen() && user.legacyPasswordHash) {
          isPasswordValid = verifyLegacyPassword(password, user.legacyPasswordHash);

          if (isPasswordValid) {
            // Opportunistic upgrade: replace WP hash with bcrypt silently
            try {
              const bcrypt = (await import('bcrypt')).default;
              const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
              user.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
              user.legacyPasswordHash = null;
              user.legacyHashType = null;
              user.passwordMigratedAt = new Date();
              await user.save();
            } catch (upgradeErr) {
              console.error(
                '[Login] bcrypt upgrade failed — continuing anyway:',
                upgradeErr.message,
              );
            }
          }
        }
      }

      // Legacy window closed and user still has no bcrypt hash — must reset password
      if (!isPasswordValid && user.passwordResetRequired) {
        return res.status(401).json({
          success: false,
          message: 'Password reset required. Please use the forgot-password flow.',
          passwordResetRequired: true,
        });
      }

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
    // TEMPORARILY DISABLED: provider/providerId columns don't exist in DB yet
    let user = await User.findByProviderId(provider, providerId);

    if (!user) {
      // Check if user exists with this email
      user = await User.findByEmail(email);

      if (user) {
        // Link OAuth account to existing user
        // TEMPORARILY DISABLED: Can't set provider/providerId (virtual fields)
        // user.provider = provider;
        // user.providerId = providerId;
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
          // name, // REMOVED: Not a database column
          // provider, // REMOVED: Virtual field, can't be set
          // providerId, // REMOVED: Virtual field, can't be set
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
 * Forgot Password
 * POST /api/auth/forgot-password
 * Generates a short-lived token and sends a reset link.
 * Always returns 200 to avoid leaking whether an email exists.
 */
export const forgotPassword = [
  body('email')
    .isEmail()
    .normalizeEmail({ gmail_remove_dots: false })
    .withMessage('Valid email is required'),

  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ success: false, message: 'Invalid email', errors: errors.array() });
      }

      const { email } = req.body;
      const user = await User.findByEmail(email);

      // Always 200 — never reveal whether email is in the system
      if (!user) {
        return res.json({
          success: true,
          message: 'If that email exists a reset link has been sent.',
        });
      }

      // Invalidate any existing unexpired tokens for this user
      await PasswordResetToken.destroy({ where: { userId: user.id, usedAt: null } });

      // Generate raw token (sent to user) and stored hash
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await PasswordResetToken.create({ userId: user.id, tokenHash, expiresAt });

      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${rawToken}`;

      if (process.env.NODE_ENV !== 'production') {
        console.log(`[ForgotPassword] Reset URL for ${email}: ${resetUrl}`);
      } else {
        // Send email via SendGrid
        try {
          const sgMail = (await import('@sendgrid/mail')).default;
          sgMail.setApiKey(process.env.SENDGRID_API_KEY);
          await sgMail.send({
            to: email,
            from: process.env.SENDGRID_FROM_EMAIL || 'noreply@agelessliterature.com',
            subject: 'Reset your Ageless Literature password',
            text: `Click the link below to reset your password (expires in 1 hour):\n\n${resetUrl}`,
            html: `<p>Click the link below to reset your password (expires in 1 hour):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
          });
        } catch (mailErr) {
          console.error('[ForgotPassword] SendGrid error:', mailErr.message);
          // Don't expose mail errors to client
        }
      }

      res.json({ success: true, message: 'If that email exists a reset link has been sent.' });
    } catch (error) {
      console.error('[ForgotPassword] Error:', error);
      res
        .status(500)
        .json({ success: false, message: 'Failed to process request', error: error.message });
    }
  },
];

/**
 * Reset Password
 * POST /api/auth/reset-password
 * Validates token, sets new bcrypt password, clears legacy hash.
 */
export const resetPassword = [
  body('token').trim().notEmpty().withMessage('Token is required'),
  body('newPassword')
    .custom(passwordComplexityValidator())
    .withMessage('Password does not meet security requirements'),

  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ success: false, message: 'Validation failed', errors: errors.array() });
      }

      const { token, newPassword } = req.body;
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      const resetToken = await PasswordResetToken.findOne({
        where: {
          tokenHash,
          usedAt: null,
        },
      });

      if (!resetToken || new Date() > resetToken.expiresAt) {
        return res.status(400).json({ success: false, message: 'Invalid or expired reset token.' });
      }

      const user = await User.findByPk(resetToken.userId);
      if (!user) {
        return res.status(400).json({ success: false, message: 'User not found.' });
      }

      // Set new bcrypt password via virtual 'password' field (triggers beforeUpdate hook)
      user.password = newPassword;
      user.legacyPasswordHash = null;
      user.legacyHashType = null;
      user.passwordResetRequired = false;
      if (!user.passwordMigratedAt) user.passwordMigratedAt = new Date();
      await user.save();

      // Mark token as used
      resetToken.usedAt = new Date();
      await resetToken.save();

      res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
    } catch (error) {
      console.error('[ResetPassword] Error:', error);
      res
        .status(500)
        .json({ success: false, message: 'Password reset failed', error: error.message });
    }
  },
];

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
