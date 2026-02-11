/**
 * Users Controller
 * User management, profiles, preferences, and SMS verification
 */

import db from '../models/index.js';
import { validatePasswordComplexity } from '../utils/passwordValidation.js';
import crypto from 'crypto';
import { sendVerificationSms, SMS_TEMPLATES } from '../services/emailService.js';

const { User, Vendor, MembershipSubscription, Order, AuctionBid, AuctionWin } = db;

/**
 * Get current authenticated user with full profile
 * GET /api/user/me
 */
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      include: [],
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Add helper flags
    const userData = user.toJSON();
    userData.isVendor = user.role === 'vendor';
    userData.isAdmin = user.role === 'admin';
    userData.hasMembership = false; // Will load separately if needed

    res.json({
      success: true,
      data: userData,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get user by ID
 * GET /api/user/:id
 */
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      attributes: { exclude: ['passwordHash'] },
      include: [],
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      data: user.toJSON(),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update user profile and preferences
 * PATCH /api/user/:id
 */
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;

    // Check permission: users can only update their own profile unless admin
    if (userId !== id && role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Allowed update fields
    const allowedFields = [
      'firstName',
      'lastName',
      'phoneNumber',
      'defaultLanguage',
      'timezone',
      'currency',
      'emailNotifications',
      'marketingEmails',
      'image',
      'metadata',
    ];

    // Admin can update role
    if (role === 'admin') {
      allowedFields.push('role');
    }

    // Update only allowed fields
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user.toJSON(),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get user statistics
 * GET /api/user/:id/stats
 */
export const getUserStats = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Get order statistics
    const orders = await Order.findAll({ where: { userId: id } });
    const totalSpent = orders.reduce((sum, order) => sum + parseFloat(order.totalAmount || 0), 0);

    // Get auction statistics
    const bidCount = await AuctionBid.count({ where: { userId: id } });
    const winCount = await AuctionWin.count({ where: { userId: id } });

    // Get vendor statistics if vendor
    let vendorStats = null;
    if (user.role === 'vendor') {
      const vendor = await Vendor.findOne({ where: { userId: id } });
      if (vendor) {
        vendorStats = {
          shopName: vendor.shopName,
          rating: vendor.rating,
          totalSales: vendor.totalSales,
          totalRevenue: vendor.totalRevenue,
          commissionsOwed: vendor.commissionsOwed,
        };
      }
    }

    // Get membership status
    const membership = await MembershipSubscription.findOne({
      where: { userId: id },
      include: [{ model: db.MembershipPlan, as: 'plan' }],
    });

    const stats = {
      orderCount: orders.length,
      totalSpent: totalSpent.toFixed(2),
      bidCount,
      winCount,
      memberSince: user.createdAt,
      lastLogin: user.lastLoginAt,
      vendorStats,
      membership: membership
        ? {
            plan: membership.plan?.name,
            status: membership.status,
            expiresAt: membership.currentPeriodEnd,
          }
        : null,
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update user password
 * PATCH /api/user/:id/password
 */
export const updatePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const { currentPassword, newPassword } = req.body;

    if (userId !== id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // OAuth users don't have passwords
    if (user.provider !== 'credentials') {
      return res.status(400).json({
        success: false,
        message: 'Cannot change password for OAuth accounts',
      });
    }

    // Verify current password
    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Validate new password
    const passwordValidation = validatePasswordComplexity(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: 'New password does not meet requirements',
        errors: passwordValidation.errors,
      });
    }

    // Update password (will be hashed by beforeUpdate hook)
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update user language preference
 * PATCH /api/user/:id/language
 */
export const updateLanguage = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const { language } = req.body;

    if (userId !== id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (!['en', 'es', 'fr', 'de'].includes(language)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid language. Supported: en, es, fr, de',
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.defaultLanguage = language;
    await user.save();

    res.json({
      success: true,
      message: 'Language preference updated',
      data: { language: user.defaultLanguage },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get user profile (for public lookup by email)
 * GET /api/users/profile?email=xxx
 */
export const getUserProfile = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email parameter required',
      });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        language: user.defaultLanguage,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Check if user is vendor
 * GET /api/user/:id/is-vendor
 */
export const checkIsVendor = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      include: [{ model: Vendor, as: 'vendorProfile' }],
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isVendor = user.isVendor() && !!user.vendorProfile;

    res.json({
      success: true,
      data: {
        isVendor,
        vendorProfile: isVendor ? user.vendorProfile : null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Check if user has active membership
 * GET /api/user/:id/is-member
 */
export const checkIsMember = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      include: [
        {
          model: MembershipSubscription,
          as: 'subscription',
          include: [{ model: db.MembershipPlan, as: 'plan' }],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMember = !!user.subscription && user.subscription.status === 'active';

    res.json({
      success: true,
      data: {
        isMember,
        subscription: isMember ? user.subscription : null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Check if user is admin
 * GET /api/user/:id/is-admin
 */
export const checkIsAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        isAdmin: user.isAdmin(),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete user account (soft delete)
 * DELETE /api/user/:id
 */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;

    // Only admin or self can delete
    if (userId !== id && role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Soft delete: set status to inactive
    user.status = 'inactive';
    await user.save();

    res.json({
      success: true,
      message: 'Account deactivated successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ==============================================================================
 * SMS Verification & Preferences (Phase 5 - TCPA Compliant)
 * ==============================================================================
 */

/**
 * Start phone verification
 * POST /api/sms/start-verification
 * Body: { phoneNumber: "+12345678900" }
 */
export const startSmsVerification = async (req, res) => {
  try {
    const { userId } = req.user;
    const { phoneNumber } = req.body;

    // Validate E.164 format
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    if (!phoneNumber || !e164Regex.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number. Must be E.164 format (e.g., +12345678900)',
      });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store in user metadata
    const metadata = user.metadata || {};
    metadata.smsVerification = {
      codeHash,
      expiresAt: expiresAt.toISOString(),
      attempts: 0,
    };
    user.phoneNumber = phoneNumber;
    user.metadata = metadata;
    await user.save();

    // Send SMS
    const result = await sendVerificationSms(phoneNumber, code);

    if (!result.ok) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification code',
        error: result.error,
      });
    }

    res.json({
      success: true,
      message: 'Verification code sent',
      data: {
        phoneNumber,
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error starting SMS verification:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Confirm phone verification
 * POST /api/sms/confirm-verification
 * Body: { code: "123456" }
 */
export const confirmSmsVerification = async (req, res) => {
  try {
    const { userId } = req.user;
    const { code } = req.body;

    if (!code || code.length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code',
      });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const metadata = user.metadata || {};
    const verification = metadata.smsVerification;

    if (!verification || !verification.codeHash) {
      return res.status(400).json({
        success: false,
        message: 'No verification code pending. Please request a new code.',
      });
    }

    // Check expiry
    const now = new Date();
    const expiresAt = new Date(verification.expiresAt);
    if (now > expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'Verification code expired. Please request a new code.',
      });
    }

    // Check attempts (max 5)
    if (verification.attempts >= 5) {
      return res.status(429).json({
        success: false,
        message: 'Too many failed attempts. Please request a new code.',
      });
    }

    // Verify code
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    if (codeHash !== verification.codeHash) {
      verification.attempts = (verification.attempts || 0) + 1;
      metadata.smsVerification = verification;
      user.metadata = metadata;
      await user.save();

      return res.status(400).json({
        success: false,
        message: 'Invalid verification code',
        attemptsRemaining: 5 - verification.attempts,
      });
    }

    // Success! Mark phone as verified and opt user in
    metadata.smsVerified = true;
    metadata.smsOptIn = true;
    metadata.smsOptInTimestamp = new Date().toISOString();
    metadata.smsStop = false;
    delete metadata.smsVerification; // Clear verification data
    user.metadata = metadata;
    await user.save();

    res.json({
      success: true,
      message: 'Phone verified successfully. SMS notifications enabled.',
      data: {
        phoneNumber: user.phoneNumber,
        smsOptIn: true,
        smsVerified: true,
      },
    });
  } catch (error) {
    console.error('Error confirming SMS verification:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Opt out of SMS notifications
 * POST /api/sms/opt-out
 */
export const smsOptOut = async (req, res) => {
  try {
    const { userId } = req.user;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const metadata = user.metadata || {};
    metadata.smsOptIn = false;
    metadata.smsStop = true;
    metadata.smsStopTimestamp = new Date().toISOString();
    user.metadata = metadata;
    await user.save();

    res.json({
      success: true,
      message: 'You have been unsubscribed from SMS notifications',
    });
  } catch (error) {
    console.error('Error opting out of SMS:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Opt in to SMS notifications (requires verified phone)
 * POST /api/sms/opt-in
 */
export const smsOptIn = async (req, res) => {
  try {
    const { userId } = req.user;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const metadata = user.metadata || {};

    // Must have verified phone
    if (!metadata.smsVerified) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must be verified before opting in to SMS',
      });
    }

    metadata.smsOptIn = true;
    metadata.smsStop = false;
    metadata.smsOptInTimestamp = new Date().toISOString();
    user.metadata = metadata;
    await user.save();

    res.json({
      success: true,
      message: 'SMS notifications enabled',
    });
  } catch (error) {
    console.error('Error opting in to SMS:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get SMS preferences
 * GET /api/sms/preferences
 */
export const getSmsPreferences = async (req, res) => {
  try {
    const { userId } = req.user;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const metadata = user.metadata || {};

    res.json({
      success: true,
      data: {
        phoneNumber: user.phoneNumber || null,
        smsVerified: metadata.smsVerified || false,
        smsOptIn: metadata.smsOptIn || false,
        smsStop: metadata.smsStop || false,
        smsOptInTimestamp: metadata.smsOptInTimestamp || null,
      },
    });
  } catch (error) {
    console.error('Error getting SMS preferences:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ==============================================================================
 * Twilio Inbound Webhook (STOP/HELP Compliance)
 * ==============================================================================
 */

/**
 * Handle inbound SMS from Twilio
 * POST /api/twilio/inbound
 */
export const handleInboundSms = async (req, res) => {
  try {
    const { From, Body } = req.body;

    if (!From || !Body) {
      return res.status(400).send('Invalid webhook data');
    }

    const bodyUpper = Body.trim().toUpperCase();
    const fromPhone = From; // E.164 format from Twilio

    // Find user by phone number
    const user = await User.findOne({ where: { phoneNumber: fromPhone } });

    // Handle STOP/UNSUBSCRIBE commands
    if (['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'].includes(bodyUpper)) {
      if (user) {
        const metadata = user.metadata || {};
        metadata.smsOptIn = false;
        metadata.smsStop = true;
        metadata.smsStopTimestamp = new Date().toISOString();
        user.metadata = metadata;
        await user.save();
      }

      // Respond with TwiML
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${SMS_TEMPLATES.STOP_CONFIRMATION()}</Message>
</Response>`;

      return res.type('text/xml').send(twiml);
    }

    // Handle START/UNSTOP commands
    if (['START', 'UNSTOP', 'YES'].includes(bodyUpper)) {
      if (user) {
        const metadata = user.metadata || {};
        if (metadata.smsVerified) {
          metadata.smsOptIn = true;
          metadata.smsStop = false;
          metadata.smsOptInTimestamp = new Date().toISOString();
          user.metadata = metadata;
          await user.save();
        }
      }

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>You've been re-subscribed to Ageless Literature SMS notifications.</Message>
</Response>`;

      return res.type('text/xml').send(twiml);
    }

    // Handle HELP command
    if (bodyUpper === 'HELP') {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${SMS_TEMPLATES.HELP_RESPONSE()}</Message>
</Response>`;

      return res.type('text/xml').send(twiml);
    }

    // Unknown command - send help response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${SMS_TEMPLATES.HELP_RESPONSE()}</Message>
</Response>`;

    res.type('text/xml').send(twiml);
  } catch (error) {
    console.error('Error handling inbound SMS:', error);
    res.status(500).send('Internal server error');
  }
};
