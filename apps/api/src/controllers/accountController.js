/**
 * Account Management Controller
 * Password updates and address management
 */

import bcrypt from 'bcrypt';
import db from '../models/index.js';

const { User } = db;

/**
 * POST /api/account/update-password
 * Update user password
 */
export const updatePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long',
      });
    }

    const user = await User.findByPk(userId, {
      include: [],
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    // Hash and update new password
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Failed to update password:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/account/billing-address
 * Get user billing address
 */
export const getBillingAddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findByPk(userId, {
      include: [],
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      data: user.billingAddress || null,
    });
  } catch (error) {
    console.error('Failed to get billing address:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/account/billing-address
 * Update user billing address
 */
export const updateBillingAddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const addressData = req.body;

    // Validate required fields
    if (
      !addressData.fullName ||
      !addressData.addressLine1 ||
      !addressData.city ||
      !addressData.state ||
      !addressData.postalCode ||
      !addressData.country ||
      !addressData.phone
    ) {
      return res.status(400).json({
        success: false,
        message: 'All required address fields must be provided',
      });
    }

    const user = await User.findByPk(userId, {
      include: [],
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.billingAddress = addressData;
    await user.save();

    res.json({
      success: true,
      message: 'Billing address updated successfully',
      data: user.billingAddress,
    });
  } catch (error) {
    console.error('Failed to update billing address:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/account/shipping-address
 * Get user shipping address
 */
export const getShippingAddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findByPk(userId, {
      include: [],
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      data: user.shippingAddress || null,
    });
  } catch (error) {
    console.error('Failed to get shipping address:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/account/shipping-address
 * Update user shipping address
 */
export const updateShippingAddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const addressData = req.body;

    // Validate required fields
    if (
      !addressData.fullName ||
      !addressData.addressLine1 ||
      !addressData.city ||
      !addressData.state ||
      !addressData.postalCode ||
      !addressData.country ||
      !addressData.phone
    ) {
      return res.status(400).json({
        success: false,
        message: 'All required address fields must be provided',
      });
    }

    const user = await User.findByPk(userId, {
      include: [],
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.shippingAddress = addressData;
    await user.save();

    res.json({
      success: true,
      message: 'Shipping address updated successfully',
      data: user.shippingAddress,
    });
  } catch (error) {
    console.error('Failed to update shipping address:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
