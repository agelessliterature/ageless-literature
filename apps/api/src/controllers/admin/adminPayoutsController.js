/**
 * Admin Payout Controller
 * Handles manual vendor payouts (no Stripe Connect)
 */

import db from '../../models/index.js';
import { sendTemplatedEmail } from '../../services/emailService.js';

const { Vendor, VendorPayout, VendorEarning, User } = db;

/**
 * Get all payouts
 * GET /api/admin/payouts
 * Query: status, vendorId, page, limit
 */
export const listPayouts = async (req, res) => {
  try {
    const { status, vendorId, page = 1, limit = 20 } = req.query;

    const where = {};
    if (status) where.status = status;
    if (vendorId) where.vendorId = vendorId;

    const { count, rows } = await VendorPayout.findAndCountAll({
      where,
      include: [
        {
          model: Vendor,
          as: 'vendor',
          attributes: ['id', 'shopName', 'shopUrl', 'userId'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    return res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve payouts',
      error: error.message,
    });
  }
};

/**
 * Get payout by ID
 * GET /api/admin/payouts/:id
 */
export const getPayoutById = async (req, res) => {
  try {
    const { id } = req.params;

    const payout = await VendorPayout.findByPk(id, {
      include: [
        {
          model: Vendor,
          as: 'vendor',
          attributes: ['id', 'shopName', 'shopUrl', 'userId', 'preferredPayoutMethod'],
        },
        {
          model: VendorEarning,
          as: 'earnings',
          limit: 100,
        },
      ],
    });

    if (!payout) {
      return res.status(404).json({
        success: false,
        message: 'Payout not found',
      });
    }

    return res.json({
      success: true,
      data: payout,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve payout',
      error: error.message,
    });
  }
};

/**
 * Create new payout for vendor
 * POST /api/admin/payouts
 * Body: { vendorId, amount, method, accountDetails, vendorNotes, payoutNotes }
 */
export const createPayout = async (req, res) => {
  try {
    const adminUserId = req.user?.id;
    const { vendorId, amount, method, accountDetails, vendorNotes, payoutNotes } = req.body;

    // Validation
    if (!vendorId || !amount || !method) {
      return res.status(400).json({
        success: false,
        message: 'Vendor ID, amount, and payment method are required',
      });
    }

    const vendor = await Vendor.findByPk(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    // Check if vendor has sufficient balance
    const requestedAmount = parseFloat(amount);
    if (requestedAmount > parseFloat(vendor.balanceAvailable)) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Available: $${vendor.balanceAvailable}`,
      });
    }

    // Create payout record
    const payout = await VendorPayout.create({
      vendorId,
      amount: requestedAmount,
      method,
      accountDetails,
      vendorNotes,
      payoutNotes,
      status: 'pending',
      processedBy: adminUserId,
    });

    // Deduct from vendor's available balance
    await vendor.update({
      balanceAvailable: parseFloat(vendor.balanceAvailable) - requestedAmount,
    });

    // Get vendor user for email
    const user = await User.findByPk(vendor.userId);

    // Send payout notification email
    if (user) {
      await sendTemplatedEmail('vendor-payout-created', user.email, {
        firstName: user.firstName || user.name,
        shopName: vendor.shopName,
        amount: requestedAmount.toFixed(2),
        method,
        notes: vendorNotes || '',
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Payout created successfully',
      data: payout,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create payout',
      error: error.message,
    });
  }
};

/**
 * Mark payout as paid
 * PATCH /api/admin/payouts/:id/mark-paid
 * Body: { transactionId, payoutNotes }
 */
export const markPayoutAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const adminUserId = req.user?.id;
    const { transactionId, payoutNotes } = req.body;

    const payout = await VendorPayout.findByPk(id, {
      include: [
        {
          model: Vendor,
          as: 'vendor',
        },
      ],
    });

    if (!payout) {
      return res.status(404).json({
        success: false,
        message: 'Payout not found',
      });
    }

    if (payout.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Payout is already marked as paid',
      });
    }

    await payout.update({
      status: 'paid',
      processedAt: new Date(),
      processedBy: adminUserId,
      transactionId,
      payoutNotes: payoutNotes || payout.payoutNotes,
    });

    // Update all associated earnings to mark as paid out
    await VendorEarning.update(
      {
        paidOut: true,
        paidAt: new Date(),
        payoutId: payout.id,
      },
      {
        where: {
          vendorId: payout.vendorId,
          paidOut: false,
          status: 'completed',
        },
      },
    );

    // Send confirmation email
    const user = await User.findByPk(payout.vendor.userId);
    if (user) {
      await sendTemplatedEmail('vendor-payout-completed', user.email, {
        firstName: user.firstName || user.name,
        shopName: payout.vendor.shopName,
        amount: payout.amount,
        method: payout.method,
        transactionId: transactionId || 'N/A',
      });
    }

    return res.json({
      success: true,
      message: 'Payout marked as paid',
      data: payout,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to mark payout as paid',
      error: error.message,
    });
  }
};

/**
 * Cancel payout
 * PATCH /api/admin/payouts/:id/cancel
 * Body: { reason }
 */
export const cancelPayout = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const payout = await VendorPayout.findByPk(id, {
      include: [{ model: Vendor, as: 'vendor' }],
    });

    if (!payout) {
      return res.status(404).json({
        success: false,
        message: 'Payout not found',
      });
    }

    if (payout.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a paid payout',
      });
    }

    await payout.update({
      status: 'cancelled',
      failureReason: reason,
    });

    // Refund amount back to vendor's available balance
    await payout.vendor.update({
      balanceAvailable: parseFloat(payout.vendor.balanceAvailable) + parseFloat(payout.amount),
    });

    return res.json({
      success: true,
      message: 'Payout cancelled',
      data: payout,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel payout',
      error: error.message,
    });
  }
};

/**
 * Adjust vendor balance manually
 * POST /api/admin/vendors/:vendorId/adjust-balance
 * Body: { amount, type (add/subtract), reason }
 */
export const adjustVendorBalance = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { amount, type, reason } = req.body;

    if (!amount || !type || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Amount, type, and reason are required',
      });
    }

    const vendor = await Vendor.findByPk(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    const adjustment = parseFloat(amount);
    const currentBalance = parseFloat(vendor.balanceAvailable);

    let newBalance;
    if (type === 'add') {
      newBalance = currentBalance + adjustment;
    } else if (type === 'subtract') {
      newBalance = currentBalance - adjustment;
      if (newBalance < 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot subtract more than available balance',
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Type must be "add" or "subtract"',
      });
    }

    await vendor.update({
      balanceAvailable: newBalance,
      adminNotes: `${vendor.adminNotes || ''}\n[${new Date().toISOString()}] Balance adjustment: ${type} $${adjustment.toFixed(2)}. Reason: ${reason}`,
    });

    return res.json({
      success: true,
      message: 'Balance adjusted successfully',
      data: {
        previousBalance: currentBalance,
        adjustment: type === 'add' ? adjustment : -adjustment,
        newBalance,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to adjust balance',
      error: error.message,
    });
  }
};

/**
 * Get payout statistics
 * GET /api/admin/payouts/stats
 */
export const getPayoutStats = async (req, res) => {
  try {
    const statsResult = await VendorPayout.findAll({
      attributes: [
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'totalPayouts'],
        [
          db.sequelize.fn('COALESCE', db.sequelize.fn('SUM', db.sequelize.col('amount')), 0),
          'totalAmount',
        ],
        [
          db.sequelize.fn(
            'COALESCE',
            db.sequelize.fn(
              'SUM',
              db.sequelize.literal("CASE WHEN status = 'paid' THEN amount ELSE 0 END"),
            ),
            0,
          ),
          'totalPaid',
        ],
        [
          db.sequelize.fn(
            'COALESCE',
            db.sequelize.fn(
              'SUM',
              db.sequelize.literal("CASE WHEN status = 'pending' THEN amount ELSE 0 END"),
            ),
            0,
          ),
          'totalPending',
        ],
      ],
      raw: true,
    });

    const stats = statsResult[0] || {
      totalPayouts: 0,
      totalAmount: 0,
      totalPaid: 0,
      totalPending: 0,
    };

    return res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve payout statistics',
      error: error.message,
    });
  }
};
