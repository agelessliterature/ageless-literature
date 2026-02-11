/**
 * Admin Users Controller
 * Manages user accounts, roles, and status using Sequelize
 */

import db from '../../models/index.js';
import { Op } from 'sequelize';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * List all users with advanced filtering
 * Query params: page, limit, role, search, sortBy, sortOrder, membershipStatus
 * Note: status filter removed since status column doesn't exist in users table
 */
export const listAll = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      membershipStatus,
    } = req.query;

    const where = {};

    // Role filter
    if (role) where.role = role;

    // Status filter
    if (status) where.status = status;

    // Search filter (email, name, firstName, lastName)
    if (search) {
      where[Op.or] = [
        { email: { [Op.iLike]: `%${search}%` } },
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build include for membership and vendor data (only if models exist)
    const include = [];

    // Add membership subscription include if model exists
    if (db.MembershipSubscription) {
      const subscriptionInclude = {
        model: db.MembershipSubscription,
        as: 'subscription',
        required: false,
        include: db.MembershipPlan
          ? [
              {
                model: db.MembershipPlan,
                as: 'plan',
                attributes: ['id', 'name', 'price', 'currency'],
              },
            ]
          : [],
      };

      // Filter by membership status if provided
      if (membershipStatus === 'active') {
        subscriptionInclude.where = { status: 'active' };
        subscriptionInclude.required = true;
      } else if (membershipStatus === 'inactive') {
        subscriptionInclude.where = { status: { [Op.or]: ['cancelled', 'expired'] } };
        subscriptionInclude.required = true;
      }

      include.push(subscriptionInclude);
    }

    // Add vendor profile include if model exists
    if (db.Vendor) {
      include.push({
        model: db.Vendor,
        as: 'vendorProfile',
        required: false,
        attributes: ['id', 'shopName', 'status'],
      });
    }

    // Valid sort fields
    const validSortFields = ['createdAt', 'email', 'name', 'role', 'status', 'lastLoginAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const { count, rows } = await db.User.findAndCountAll({
      where,
      include,
      limit: parseInt(limit),
      offset,
      attributes: { exclude: ['passwordHash'] },
      order: [[sortField, sortDirection]],
      distinct: true,
    });

    return res.json({
      success: true,
      data: {
        users: rows,
        pagination: {
          total: count,
          totalPages: Math.ceil(count / parseInt(limit)),
          currentPage: parseInt(page),
          perPage: parseInt(limit),
          hasNextPage: parseInt(page) < Math.ceil(count / parseInt(limit)),
          hasPrevPage: parseInt(page) > 1,
        },
      },
      message: 'Users retrieved successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve users',
      error: error.message,
    });
  }
};

/**
 * Update user role
 * Body: { role: 'admin' | 'vendor' | 'customer' }
 */
export const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ['admin', 'vendor', 'customer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
      });
    }

    // Check if trying to remove last admin
    if (role !== 'admin') {
      const user = await db.User.findByPk(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      if (user.role === 'admin') {
        const adminCount = await db.User.count({
          where: { role: 'admin' },
        });

        if (adminCount <= 1) {
          return res.status(400).json({
            success: false,
            message: 'Cannot remove the last admin',
          });
        }
      }
    }

    await db.User.update(
      { role },
      {
        where: { id },
        returning: true,
      },
    );

    const user = await db.User.findByPk(id, {
      attributes: { exclude: ['passwordHash'] },
    });

    return res.json({
      success: true,
      data: user,
      message: 'User role updated successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update user role',
      error: error.message,
    });
  }
};

/**
 * Toggle user status
 * Body: { status: 'active' | 'inactive' | 'suspended' }
 */
export const toggleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const adminUserId = req.userId;

    const validStatuses = ['active', 'inactive', 'suspended'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    // Prevent self-suspension
    if (adminUserId === id && status === 'suspended') {
      return res.status(400).json({
        success: false,
        message: 'Cannot suspend your own account',
      });
    }

    await db.User.update({ status }, { where: { id } });

    const user = await db.User.findByPk(id, {
      attributes: { exclude: ['passwordHash'] },
    });

    return res.json({
      success: true,
      data: user,
      message: 'User status updated successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update user status',
      error: error.message,
    });
  }
};

/**
 * Delete user (soft delete - set status to inactive)
 */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const adminUserId = req.userId;

    // Prevent self-deletion
    if (adminUserId === id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account',
      });
    }

    // Check if deleting last admin
    const user = await db.User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.role === 'admin') {
      const adminCount = await db.User.count({
        where: { role: 'admin' },
      });

      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete the last admin',
        });
      }
    }

    // Soft delete - set status to inactive
    await db.User.update({ status: 'inactive' }, { where: { id } });

    return res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message,
    });
  }
};

/**
 * Get single user details
 */
export const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('[AdminUsersController] getUser called for ID:', id);

    const user = await db.User.findByPk(id, {
      attributes: { exclude: ['passwordHash'] },
      include: [
        {
          model: db.MembershipSubscription,
          as: 'subscription',
          required: false,
          include: [
            {
              model: db.MembershipPlan,
              as: 'plan',
              required: false,
            },
          ],
        },
        {
          model: db.Vendor,
          as: 'vendorProfile',
          required: false,
        },
        // Orders table not in current database schema
        // {
        //   model: db.Order,
        //   as: 'orders',
        //   limit: 5,
        //   order: [['createdAt', 'DESC']],
        //   attributes: ['id', 'orderNumber', 'totalAmount', 'status', 'createdAt']
        // }
      ],
    });

    if (!user) {
      console.log('[AdminUsersController] User not found for ID:', id);
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    console.log('[AdminUsersController] Successfully retrieved user:', user.id);
    return res.json({
      success: true,
      data: user,
      message: 'User retrieved successfully',
    });
  } catch (error) {
    console.error('[AdminUsersController] Error in getUser:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user',
      error: error.message,
    });
  }
};

/**
 * Update user details
 * Body: { email, firstName, lastName, phoneNumber, defaultLanguage, status, role }
 */
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const adminUserId = req.userId;

    // Prevent changing own role
    if (adminUserId === id && updates.role && updates.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own role',
      });
    }

    // Validate email uniqueness if email is being changed
    if (updates.email) {
      const existingUser = await db.User.findOne({
        where: {
          email: updates.email,
          id: { [Op.ne]: id },
        },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use by another user',
        });
      }
    }

    // Allowed fields to update
    const allowedFields = [
      'email',
      'firstName',
      'lastName',
      'phoneNumber',
      'defaultLanguage',
      'status',
      'role',
      'emailVerified',
      'emailNotifications',
      'marketingEmails',
      'profilePhotoUrl',
      'profilePhotoPublicId',
    ];

    const filteredUpdates = {};
    Object.keys(updates).forEach((key) => {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    await db.User.update(filteredUpdates, { where: { id } });

    const updatedUser = await db.User.findByPk(id, {
      attributes: { exclude: ['passwordHash'] },
      include: [
        {
          model: db.MembershipSubscription,
          as: 'subscription',
          include: [
            {
              model: db.MembershipPlan,
              as: 'plan',
            },
          ],
        },
        {
          model: db.Vendor,
          as: 'vendorProfile',
        },
      ],
    });

    return res.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message,
    });
  }
};

/**
 * Reset user password
 * Body: { newPassword }
 */
export const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long',
      });
    }

    const user = await db.User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Update password (hook will hash it)
    user.password = newPassword;
    await user.save();

    return res.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      error: error.message,
    });
  }
};

/**
 * Create new user
 * Body: { email, password, firstName, lastName, role, status, defaultLanguage }
 */
export const createUser = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, status, defaultLanguage, sendInviteEmail } =
      req.body;

    // Validation
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    // Password is optional if sending invite email
    if (!password && !sendInviteEmail) {
      return res.status(400).json({
        success: false,
        message: 'Password is required when not sending an invite email',
      });
    }

    if (password && password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long',
      });
    }

    const validRoles = ['admin', 'vendor', 'customer'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be admin, vendor, or customer',
      });
    }

    const validStatuses = ['active', 'inactive', 'pending', 'revoked'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be active, inactive, pending, or revoked',
      });
    }

    // Check if email already exists
    const existingUser = await db.User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists',
      });
    }

    // Determine user status based on whether invite email is being sent
    let userStatus = status || 'active';
    if (sendInviteEmail && !status) {
      userStatus = 'pending'; // Set to pending when sending invite email
    }

    // Create user
    const newUser = await db.User.create({
      email,
      password: password || null, // Will be hashed by model hook if provided
      firstName: firstName || null,
      lastName: lastName || null,
      role: role || 'customer',
      status: userStatus,
      defaultLanguage: defaultLanguage || 'en',
      provider: 'credentials',
      emailVerified: !sendInviteEmail, // Not verified if sending invite, verified if creating with password
    });

    // TODO: Send invite email if sendInviteEmail is true
    // This should send an email with a password reset link
    if (sendInviteEmail) {
      console.log(`[AdminUsersController] TODO: Send invite email to ${email}`);
      // Future: Implement email sending with password reset link
    }

    const userResponse = await db.User.findByPk(newUser.id, {
      attributes: { exclude: ['passwordHash'] },
      include: [
        ...(db.MembershipSubscription
          ? [
              {
                model: db.MembershipSubscription,
                as: 'subscription',
                required: false,
              },
            ]
          : []),
        ...(db.Vendor
          ? [
              {
                model: db.Vendor,
                as: 'vendorProfile',
                required: false,
              },
            ]
          : []),
      ],
    });

    return res.status(201).json({
      success: true,
      data: userResponse,
      message: sendInviteEmail
        ? 'User created successfully. Invite email sent.'
        : 'User created successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message,
    });
  }
};

/**
 * Get user statistics
 * Updated to use status field: active, inactive, pending, revoked
 */
export const getUserStats = async (req, res) => {
  try {
    const totalUsers = await db.User.count();
    const activeUsers = await db.User.count({ where: { status: 'active' } });
    const pendingUsers = await db.User.count({ where: { status: 'pending' } });
    const inactiveUsers = await db.User.count({ where: { status: 'inactive' } });
    const revokedUsers = await db.User.count({ where: { status: 'revoked' } });
    const adminUsers = await db.User.count({ where: { role: 'admin' } });
    const vendorUsers = await db.User.count({ where: { role: 'vendor' } });

    let membershipUsers = 0;
    if (db.MembershipSubscription) {
      try {
        membershipUsers = await db.User.count({
          include: [
            {
              model: db.MembershipSubscription,
              as: 'subscription',
              where: { status: 'active' },
              required: true,
            },
          ],
        });
      } catch (membershipError) {
        // Continue without membership count
      }
    }

    return res.json({
      success: true,
      data: {
        total: totalUsers,
        active: activeUsers,
        pending: pendingUsers,
        inactive: inactiveUsers,
        revoked: revokedUsers,
        admins: adminUsers,
        vendors: vendorUsers,
        withMembership: membershipUsers,
      },
      message: 'User statistics retrieved successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user statistics',
      error: error.message,
    });
  }
};

/**
 * Get user's payment methods (admin)
 * GET /api/admin/users/:id/payment-methods
 */
export const getUserPaymentMethods = async (req, res) => {
  try {
    const { id: userId } = req.params;

    // Check if user exists
    const user = await db.User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Find user's Stripe customer ID from subscriptions
    const subscription = await db.MembershipSubscription.findOne({
      where: { userId },
      order: [['createdAt', 'DESC']],
    });

    if (!subscription?.stripeCustomerId) {
      return res.json({
        success: true,
        data: [],
        message: 'No payment methods found',
      });
    }

    // Fetch payment methods from Stripe
    const paymentMethods = await stripe.paymentMethods.list({
      customer: subscription.stripeCustomerId,
      type: 'card',
    });

    // Get customer to check default payment method
    const customer = await stripe.customers.retrieve(subscription.stripeCustomerId);
    const defaultPaymentMethodId = customer.invoice_settings?.default_payment_method;

    // Format payment methods
    const formattedMethods = paymentMethods.data.map((pm) => ({
      id: pm.id,
      brand: pm.card.brand,
      last4: pm.card.last4,
      expMonth: pm.card.exp_month,
      expYear: pm.card.exp_year,
      isDefault: pm.id === defaultPaymentMethodId,
    }));

    return res.json({
      success: true,
      data: formattedMethods,
      message: 'Payment methods retrieved successfully',
    });
  } catch (error) {
    console.error('[Admin] Get payment methods error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment methods',
      error: error.message,
    });
  }
};
