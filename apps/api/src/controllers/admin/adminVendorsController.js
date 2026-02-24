/**
 * Admin Vendors Controller
 * Manages vendor applications and approvals
 * Complete vendor management system
 */

import db from '../../models/index.js';
import { sendTemplatedEmail } from '../../services/emailService.js';
import { Op } from 'sequelize';

const { Vendor, User, VendorEarning, VendorPayout, Book, Auction, Order, OrderItem } = db;

/**
 * List all vendors with advanced filtering
 * Query params: page, limit, status, search, sortBy, sortOrder, commissionType
 */
export const listAll = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      commissionType,
    } = req.query;

    const where = {};

    // Status filter
    if (status) where.status = status;

    // Search filter (shop name, user email, user name)
    if (search) {
      where[Op.or] = [
        { shopName: { [Op.iLike]: `%${search}%` } },
        { shopUrl: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Commission type filter
    if (commissionType === 'custom') {
      where.commissionRate = { [Op.ne]: 0.08 };
    } else if (commissionType === 'default') {
      where.commissionRate = 0.08;
    }

    // Valid sort fields
    const validSortFields = [
      'createdAt',
      'shopName',
      'lifetimeGrossSales',
      'lifetimeVendorEarnings',
      'balanceAvailable',
      'menuOrder',
    ];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const { count, rows } = await Vendor.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'firstName', 'lastName', 'provider', 'createdAt'],
          where: search
            ? {
                [Op.or]: [
                  { email: { [Op.iLike]: `%${search}%` } },
                  { firstName: { [Op.iLike]: `%${search}%` } },
                  { lastName: { [Op.iLike]: `%${search}%` } },
                ],
              }
            : undefined,
        },
      ],
      order: [[sortField, sortDirection]],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      distinct: true,
    });

    return res.json({
      success: true,
      data: {
        vendors: rows,
        pagination: {
          total: count,
          totalPages: Math.ceil(count / parseInt(limit)),
          currentPage: parseInt(page),
          perPage: parseInt(limit),
          hasNextPage: parseInt(page) < Math.ceil(count / parseInt(limit)),
          hasPrevPage: parseInt(page) > 1,
        },
      },
      message: 'Vendors retrieved successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve vendors',
      error: error.message,
    });
  }
};

/**
 * Get vendor details by ID
 * GET /api/admin/vendors/:id
 */
export const getVendorById = async (req, res) => {
  try {
    const { id } = req.params;

    const vendor = await Vendor.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: [
            'id',
            'email',
            'firstName',
            'lastName',
            'phoneNumber',
            'provider',
            'createdAt',
          ],
        },
      ],
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    // Get earnings summary - use findAll for aggregates
    let earningsSummary = {
      totalEarnings: 0,
      totalCommission: 0,
      totalGross: 0,
      totalTransactions: 0,
    };

    try {
      const earningsSummaryResult = await VendorEarning.findAll({
        where: { vendorId: id },
        attributes: [
          [
            db.sequelize.fn('COALESCE', db.sequelize.fn('SUM', db.sequelize.col('net_amount')), 0),
            'totalEarnings',
          ],
          [
            db.sequelize.fn(
              'COALESCE',
              db.sequelize.fn('SUM', db.sequelize.col('platform_fee')),
              0,
            ),
            'totalCommission',
          ],
          [
            db.sequelize.fn('COALESCE', db.sequelize.fn('SUM', db.sequelize.col('amount')), 0),
            'totalGross',
          ],
          [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'totalTransactions'],
        ],
        raw: true,
      });

      earningsSummary = earningsSummaryResult[0] || earningsSummary;
    } catch (earningsError) {
      console.error(
        '[AdminVendorsController] Error fetching earnings summary:',
        earningsError.message,
      );
      // Use default empty earnings summary
    }

    return res.json({
      success: true,
      data: {
        ...vendor.toJSON(),
        earningsSummary,
      },
    });
  } catch (error) {
    console.error('[AdminVendorsController] Error in getVendorById:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve vendor',
      error: error.message,
    });
  }
};

/**
 * Approve vendor
 * PATCH /api/admin/vendors/:id/approve
 */
export const approveVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;

    const vendor = await Vendor.findByPk(id, {
      include: [{ model: User, as: 'user' }],
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    if (vendor.status === 'approved' || vendor.status === 'active') {
      return res.status(400).json({
        success: false,
        message: 'Vendor is already approved',
      });
    }

    // Update vendor status
    await vendor.update({
      status: 'approved',
      approvedAt: new Date(),
      approvedBy: adminId,
      rejectionReason: null, // Clear any previous rejection
    });

    // Update user role to vendor
    await vendor.user.update({
      role: 'vendor',
    });

    // Send approval email
    try {
      await sendTemplatedEmail('vendor-application-approved', vendor.user.email, {
        firstName: vendor.user.firstName,
        lastName: vendor.user.lastName,
        shopName: vendor.shopName,
        dashboardUrl: `${process.env.FRONTEND_URL}/vendor/dashboard`,
        commissionRate: '8%',
        approvalDate: new Date().toLocaleDateString(),
      });
    } catch (emailError) {
      // Continue anyway - vendor is already approved
    }

    return res.json({
      success: true,
      data: vendor,
      message: 'Vendor approved successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to approve vendor',
      error: error.message,
    });
  }
};

/**
 * Reject vendor
 * PATCH /api/admin/vendors/:id/reject
 * Body: { reason }
 */
export const rejectVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required',
      });
    }

    const vendor = await Vendor.findByPk(id, {
      include: [{ model: User, as: 'user' }],
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    // Update vendor status
    await vendor.update({
      status: 'rejected',
      rejectionReason: reason,
    });

    // Update user role back to customer
    await vendor.user.update({
      role: 'customer',
    });

    // Send rejection email
    try {
      await sendTemplatedEmail('vendor-application-rejected', vendor.user.email, {
        firstName: vendor.user.firstName,
        lastName: vendor.user.lastName,
        shopName: vendor.shopName,
        rejectionReason: reason,
        reapplyUrl: `${process.env.FRONTEND_URL}/vendor-registration`,
        supportEmail: process.env.SUPPORT_EMAIL || 'support@agelessliterature.com',
      });
    } catch (emailError) {
      // Continue anyway - vendor is already rejected
    }

    return res.json({
      success: true,
      data: vendor,
      message: 'Vendor rejected successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to reject vendor',
      error: error.message,
    });
  }
};

/**
 * Update vendor admin notes
 * PATCH /api/admin/vendors/:id/notes
 * Body: { notes }
 */
export const updateVendorNotes = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const vendor = await Vendor.findByPk(id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    await vendor.update({ adminNotes: notes });

    return res.json({
      success: true,
      data: vendor,
      message: 'Admin notes updated successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update notes',
      error: error.message,
    });
  }
};

/**
 * Delete vendor (soft delete by archiving)
 */
export const deleteVendor = async (req, res) => {
  try {
    const { id } = req.params;

    const vendor = await Vendor.findByPk(id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    // Soft delete by archiving
    await vendor.update({ status: 'archived' });

    return res.json({
      success: true,
      message: 'Vendor archived successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete vendor',
      error: error.message,
    });
  }
};

/**
 * Get vendor statistics
 * GET /api/admin/vendors/stats
 */
export const getVendorStats = async (req, res) => {
  try {
    const total = await Vendor.count();
    const pending = await Vendor.count({ where: { status: 'pending' } });
    const approved = await Vendor.count({ where: { status: { [Op.in]: ['approved', 'active'] } } });
    const rejected = await Vendor.count({ where: { status: 'rejected' } });
    const suspended = await Vendor.count({ where: { status: 'suspended' } });

    // Get aggregate financial data - use findAll for aggregates
    let financials = {
      totalSales: 0,
      totalCommissions: 0,
      totalEarnings: 0,
      totalBalanceAvailable: 0,
    };

    try {
      const financialsResult = await Vendor.findAll({
        attributes: [
          [
            db.sequelize.fn(
              'COALESCE',
              db.sequelize.fn('SUM', db.sequelize.col('lifetime_gross_sales')),
              0,
            ),
            'totalSales',
          ],
          [
            db.sequelize.fn(
              'COALESCE',
              db.sequelize.fn('SUM', db.sequelize.col('lifetime_commission_taken')),
              0,
            ),
            'totalCommissions',
          ],
          [
            db.sequelize.fn(
              'COALESCE',
              db.sequelize.fn('SUM', db.sequelize.col('lifetime_vendor_earnings')),
              0,
            ),
            'totalEarnings',
          ],
          [
            db.sequelize.fn(
              'COALESCE',
              db.sequelize.fn('SUM', db.sequelize.col('balance_available')),
              0,
            ),
            'totalBalanceAvailable',
          ],
        ],
        raw: true,
      });

      financials = financialsResult[0] || financials;
    } catch (financialsError) {
      // Use default empty financials
    }

    // Get total payouts completed (if VendorPayout model exists)
    let payoutsCompleted = 0;
    let payoutsPending = 0;

    if (VendorPayout) {
      try {
        payoutsCompleted = await VendorPayout.count({ where: { status: 'paid' } });
        payoutsPending = await VendorPayout.count({ where: { status: 'pending' } });
      } catch (payoutError) {
        console.error('Failed to fetch payout stats:', payoutError);
      }
    }

    return res.json({
      success: true,
      data: {
        total,
        pending,
        approved,
        rejected,
        suspended,
        totalSales: parseFloat(financials.totalSales || 0),
        totalCommissions: parseFloat(financials.totalCommissions || 0),
        totalEarnings: parseFloat(financials.totalEarnings || 0),
        totalBalanceAvailable: parseFloat(financials.totalBalanceAvailable || 0),
        payoutsCompleted,
        payoutsPending,
      },
      message: 'Vendor stats retrieved successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve vendor stats',
      error: error.message,
    });
  }
};

/**
 * Update vendor details
 * PUT /api/admin/vendors/:id
 */
export const updateVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      shopName,
      commissionRate,
      status,
      adminNotes,
      rejectionReason,
      logoUrl,
      logoPublicId,
      bannerUrl,
      bannerPublicId,
      socialFacebook,
      socialTwitter,
      socialInstagram,
      socialLinkedin,
      phoneNumber,
      businessEmail,
      websiteUrl,
      businessDescription,
      shopUrl,
      businessAddress,
      billingAddress,
      taxId,
      preferredPayoutMethod,
      rating,
    } = req.body;

    const vendor = await Vendor.findByPk(id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    const updates = {};
    if (shopName !== undefined) updates.shopName = shopName;
    if (shopUrl !== undefined) updates.shopUrl = shopUrl;
    if (phoneNumber !== undefined) updates.phoneNumber = phoneNumber;
    if (businessEmail !== undefined) updates.businessEmail = businessEmail;
    if (websiteUrl !== undefined) updates.websiteUrl = websiteUrl;
    if (businessDescription !== undefined) updates.businessDescription = businessDescription;
    if (businessAddress !== undefined) updates.businessAddress = businessAddress;
    if (billingAddress !== undefined) updates.billingAddress = billingAddress;
    if (taxId !== undefined) updates.taxId = taxId;
    if (preferredPayoutMethod !== undefined) updates.preferredPayoutMethod = preferredPayoutMethod;
    if (rating !== undefined) updates.rating = rating;
    if (socialFacebook !== undefined) updates.socialFacebook = socialFacebook;
    if (socialTwitter !== undefined) updates.socialTwitter = socialTwitter;
    if (socialInstagram !== undefined) updates.socialInstagram = socialInstagram;
    if (socialLinkedin !== undefined) updates.socialLinkedin = socialLinkedin;
    if (rejectionReason !== undefined) updates.rejectionReason = rejectionReason;
    if (commissionRate !== undefined) {
      // Validate commission rate (0 - 50%)
      const rate = parseFloat(commissionRate);
      if (rate < 0 || rate > 0.5) {
        return res.status(400).json({
          success: false,
          message: 'Commission rate must be between 0 and 0.5 (0% - 50%)',
        });
      }
      updates.commissionRate = rate;
    }
    if (status !== undefined) updates.status = status;
    if (adminNotes !== undefined) updates.adminNotes = adminNotes;
    if (logoUrl !== undefined) updates.logoUrl = logoUrl;
    if (logoPublicId !== undefined) updates.logoPublicId = logoPublicId;
    if (bannerUrl !== undefined) updates.bannerUrl = bannerUrl;
    if (bannerPublicId !== undefined) updates.bannerPublicId = bannerPublicId;

    await vendor.update(updates);

    const updatedVendor = await Vendor.findByPk(id, {
      include: [{ model: User, as: 'user' }],
    });

    return res.json({
      success: true,
      data: updatedVendor,
      message: 'Vendor updated successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update vendor',
      error: error.message,
    });
  }
};

/**
 * Suspend vendor
 * POST /api/admin/vendors/:id/suspend
 */
export const suspendVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const vendor = await Vendor.findByPk(id, {
      include: [{ model: User, as: 'user' }],
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    await vendor.update({
      status: 'suspended',
      adminNotes: reason ? `Suspended: ${reason}\n\n${vendor.adminNotes || ''}` : vendor.adminNotes,
    });

    // Update user role back to customer when suspended
    await vendor.user.update({
      role: 'customer',
    });

    // Send suspension email
    if (vendor.user?.email) {
      await sendTemplatedEmail('vendor-suspended', vendor.user.email, {
        firstName: vendor.user.firstName,
        shopName: vendor.shopName,
        reason: reason || 'Terms of service violation',
        supportEmail: process.env.SUPPORT_EMAIL || 'support@agelessliterature.com',
      });
    }

    return res.json({
      success: true,
      data: vendor,
      message: 'Vendor suspended successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to suspend vendor',
      error: error.message,
    });
  }
};

/**
 * Get vendor inventory (books and auctions)
 * GET /api/admin/vendors/:id/inventory
 */
export const getVendorInventory = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const vendor = await Vendor.findByPk(id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    const books = await Book.findAndCountAll({
      where: { vendorId: id },
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['createdAt', 'DESC']],
    });

    const auctions = await Auction.findAll({
      where: { vendorId: id },
      order: [['createdAt', 'DESC']],
      limit: 10,
    });

    return res.json({
      success: true,
      data: {
        books: books.rows,
        booksCount: books.count,
        auctions,
        auctionsCount: auctions.length,
      },
      message: 'Vendor inventory retrieved successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve vendor inventory',
      error: error.message,
    });
  }
};

/**
 * Get vendor orders
 * GET /api/admin/vendors/:id/orders
 */
export const getVendorOrders = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const vendor = await Vendor.findByPk(id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    // Get order items for this vendor, then get their orders
    const orderItems = await OrderItem.findAll({
      where: { vendorId: id },
      include: [
        {
          model: Order,
          as: 'order',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'email', 'firstName', 'lastName'],
            },
          ],
        },
      ],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['createdAt', 'DESC']],
    });

    const totalOrders = await OrderItem.count({ where: { vendorId: id } });

    return res.json({
      success: true,
      data: {
        orders: orderItems,
        total: totalOrders,
      },
      message: 'Vendor orders retrieved successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve vendor orders',
      error: error.message,
    });
  }
};

/**
 * Get vendor payouts
 * GET /api/admin/vendors/:id/payouts
 */
export const getVendorPayouts = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const vendor = await Vendor.findByPk(id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    const payouts = await VendorPayout.findAndCountAll({
      where: { vendorId: id },
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['createdAt', 'DESC']],
    });

    return res.json({
      success: true,
      data: {
        payouts: payouts.rows,
        total: payouts.count,
      },
      message: 'Vendor payouts retrieved successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve vendor payouts',
      error: error.message,
    });
  }
};

/**
 * Create payout for vendor
 * POST /api/admin/vendors/:id/payouts
 */
export const createPayout = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, method, notes } = req.body;
    const adminId = req.user?.id;

    const vendor = await Vendor.findByPk(id, {
      include: [{ model: User, as: 'user' }],
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    const payoutAmount = parseFloat(amount);

    // Validate payout amount
    if (!payoutAmount || payoutAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Payout amount must be greater than 0',
      });
    }

    if (payoutAmount > parseFloat(vendor.balanceAvailable)) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Available: $${vendor.balanceAvailable}`,
      });
    }

    // Create payout record
    const payout = await VendorPayout.create({
      vendorId: id,
      amount: payoutAmount,
      method: method || 'manual',
      status: 'pending',
      payoutNotes: notes || '',
      processedBy: adminId,
    });

    // Deduct from vendor balance
    await vendor.update({
      balanceAvailable: parseFloat(vendor.balanceAvailable) - payoutAmount,
    });

    return res.json({
      success: true,
      data: payout,
      message: 'Payout created successfully',
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
 * Create vendor for existing user
 * POST /api/admin/vendors/create
 * Body: { userId, shopName, shopUrl, commissionRate, status, adminNotes }
 */
export const createVendor = async (req, res) => {
  try {
    const { userId, shopName, shopUrl, commissionRate, status, adminNotes } = req.body;

    // Validation
    if (!userId || !shopName || !shopUrl) {
      return res.status(400).json({
        success: false,
        message: 'userId, shopName, and shopUrl are required',
      });
    }

    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if user already has a vendor profile
    const existingVendor = await Vendor.findOne({ where: { userId } });
    if (existingVendor) {
      return res.status(409).json({
        success: false,
        message: 'This user already has a vendor profile',
      });
    }

    // Check if shopUrl is unique
    const existingShopUrl = await Vendor.findOne({ where: { shopUrl } });
    if (existingShopUrl) {
      return res.status(409).json({
        success: false,
        message: 'Shop URL already exists',
      });
    }

    // Validate commission rate
    const commission = commissionRate ? parseFloat(commissionRate) : 0.08;
    if (commission < 0 || commission > 0.5) {
      return res.status(400).json({
        success: false,
        message: 'Commission rate must be between 0 and 0.5 (50%)',
      });
    }

    // Create vendor profile
    const vendor = await Vendor.create({
      userId,
      shopName,
      shopUrl,
      slug: shopUrl, // Legacy field
      commissionRate: commission,
      status: status || 'pending',
      adminNotes: adminNotes || '',
      balanceAvailable: 0,
      balancePending: 0,
      lifetimeGrossSales: 0,
      lifetimeCommissionTaken: 0,
      lifetimeVendorEarnings: 0,
    });

    // Update user role to vendor if not already
    if (user.role !== 'vendor' && user.role !== 'admin') {
      await user.update({ role: 'vendor' });
    }

    // Fetch vendor with user data
    const vendorWithUser = await Vendor.findByPk(vendor.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'firstName', 'lastName'],
        },
      ],
    });

    // Send approval email if status is approved
    if (status === 'approved' || status === 'active') {
      try {
        await sendTemplatedEmail({
          to: user.email,
          subject: 'Vendor Application Approved',
          template: 'vendor-approved',
          data: {
            shopName: vendor.shopName,
            shopUrl: vendor.shopUrl,
            userName: user.name || user.firstName || user.email,
          },
        });
      } catch (emailError) {
        console.error('Failed to send vendor approval email:', emailError);
      }
    }

    return res.status(201).json({
      success: true,
      data: vendorWithUser,
      message: 'Vendor created successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create vendor',
      error: error.message,
    });
  }
};

/**
 * Create vendor with new user
 * POST /api/admin/vendors/create-with-user
 * Body: {
 *   user: { email, password, firstName, lastName },
 *   vendor: { shopName, shopUrl, commissionRate, status, adminNotes }
 * }
 */
export const createVendorWithUser = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const { user: userData, vendor: vendorData } = req.body;

    // Validation
    if (!userData || !vendorData) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'User and vendor data are required',
      });
    }

    const { email, password, firstName, lastName } = userData;
    const { shopName, shopUrl, commissionRate, status, adminNotes } = vendorData;

    if (!email || !password || !shopName || !shopUrl) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Email, password, shopName, and shopUrl are required',
      });
    }

    if (password.length < 8) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long',
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: 'Email already exists',
      });
    }

    // Check if shopUrl is unique
    const existingShopUrl = await Vendor.findOne({ where: { shopUrl } });
    if (existingShopUrl) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: 'Shop URL already exists',
      });
    }

    // Validate commission rate
    const commission = commissionRate ? parseFloat(commissionRate) : 0.08;
    if (commission < 0 || commission > 0.5) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Commission rate must be between 0 and 0.5 (50%)',
      });
    }

    // Create user
    const newUser = await User.create(
      {
        email,
        password, // Will be hashed by model hook
        firstName: firstName || null,
        lastName: lastName || null,
        name: firstName && lastName ? `${firstName} ${lastName}` : email,
        role: 'vendor',
        status: 'active',
        provider: 'credentials',
        emailVerified: true,
      },
      { transaction },
    );

    // Create vendor profile
    const vendor = await Vendor.create(
      {
        userId: newUser.id,
        shopName,
        shopUrl,
        slug: shopUrl, // Legacy field
        commissionRate: commission,
        status: status || 'pending',
        adminNotes: adminNotes || '',
        balanceAvailable: 0,
        balancePending: 0,
        lifetimeGrossSales: 0,
        lifetimeCommissionTaken: 0,
        lifetimeVendorEarnings: 0,
      },
      { transaction },
    );

    await transaction.commit();

    // Fetch vendor with user data
    const vendorWithUser = await Vendor.findByPk(vendor.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'firstName', 'lastName'],
        },
      ],
    });

    // Send approval email if status is approved
    if (status === 'approved' || status === 'active') {
      try {
        await sendTemplatedEmail({
          to: email,
          subject: 'Vendor Application Approved',
          template: 'vendor-approved',
          data: {
            shopName,
            shopUrl,
            userName: newUser.name || newUser.firstName || email,
          },
        });
      } catch (emailError) {
        console.error('Failed to send new vendor email:', emailError);
      }
    }

    return res.status(201).json({
      success: true,
      data: vendorWithUser,
      message: 'User and vendor created successfully',
    });
  } catch (error) {
    await transaction.rollback();

    return res.status(500).json({
      success: false,
      message: 'Failed to create user and vendor',
      error: error.message,
    });
  }
};

/**
 * Search users for vendor creation
 * GET /api/admin/vendors/search-users?q=email
 */
export const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: [],
        message: 'Search query too short',
      });
    }

    // Find users without vendor profiles
    const users = await User.findAll({
      where: {
        [Op.or]: [
          { email: { [Op.iLike]: `%${q}%` } },
          { firstName: { [Op.iLike]: `%${q}%` } },
          { lastName: { [Op.iLike]: `%${q}%` } },
        ],
      },
      attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'provider'],
      include: [
        {
          model: Vendor,
          as: 'vendorProfile',
          attributes: ['id'],
          required: false,
        },
      ],
      limit: 10,
    });

    // Filter out users who already have vendor profiles
    const usersWithoutVendor = users.filter((user) => !user.vendorProfile);

    return res.json({
      success: true,
      data: usersWithoutVendor.map((user) => {
        // Compute full name from firstName and lastName
        let fullName = '';
        if (user.firstName && user.lastName) {
          fullName = `${user.firstName} ${user.lastName}`;
        } else if (user.firstName) {
          fullName = user.firstName;
        } else if (user.lastName) {
          fullName = user.lastName;
        } else {
          fullName = user.email;
        }

        return {
          id: user.id,
          email: user.email,
          name: fullName,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          provider: user.provider,
        };
      }),
      message: 'Users retrieved successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to search users',
      error: error.message,
    });
  }
};

/**
 * Update featured vendor status
 * PUT /api/admin/vendors/:id/featured
 * Body: { isFeatured, featuredStartDate, featuredEndDate, featuredPriority }
 */
export const updateFeaturedStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isFeatured, featuredStartDate, featuredEndDate, featuredPriority } = req.body;

    const vendor = await Vendor.findByPk(id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    // Update featured fields
    const updateData = {};
    if (typeof isFeatured !== 'undefined') updateData.isFeatured = isFeatured;
    if (featuredStartDate !== undefined) updateData.featuredStartDate = featuredStartDate || null;
    if (featuredEndDate !== undefined) updateData.featuredEndDate = featuredEndDate || null;
    if (typeof featuredPriority !== 'undefined') updateData.featuredPriority = featuredPriority;

    await vendor.update(updateData);

    return res.json({
      success: true,
      data: vendor,
      message: 'Featured status updated successfully',
    });
  } catch (error) {
    console.error('Error updating featured status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update featured status',
      error: error.message,
    });
  }
};

/**
 * Check and expire featured vendors
 * This should be called periodically (e.g., via cron job)
 * POST /api/admin/vendors/expire-featured
 */
export const expireFeaturedVendors = async (req, res) => {
  try {
    const now = new Date();

    // Find vendors whose featured period has ended
    const expiredVendors = await Vendor.findAll({
      where: {
        isFeatured: true,
        featuredEndDate: {
          [Op.lte]: now,
          [Op.ne]: null,
        },
      },
    });

    // Turn off featured status
    for (const vendor of expiredVendors) {
      await vendor.update({ isFeatured: false });
    }

    return res.json({
      success: true,
      data: {
        expiredCount: expiredVendors.length,
        vendors: expiredVendors.map((v) => ({ id: v.id, shopName: v.shopName })),
      },
      message: `Expired ${expiredVendors.length} featured vendor(s)`,
    });
  } catch (error) {
    console.error('Error expiring featured vendors:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to expire featured vendors',
      error: error.message,
    });
  }
};

/**
 * Batch update menu_order for multiple vendors
 * PUT /api/admin/vendors/menu-order
 * Body: { items: [{ id: number, menuOrder: number }] }
 */
export const updateMenuOrder = async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'items array is required' });
    }

    for (const item of items) {
      if (!item.id || typeof item.menuOrder !== 'number') {
        return res.status(400).json({
          success: false,
          error: `Invalid item: each must have 'id' (number) and 'menuOrder' (number)`,
        });
      }
    }

    const cases = items
      .map((i) => `WHEN ${parseInt(i.id)} THEN ${parseInt(i.menuOrder)}`)
      .join(' ');
    const ids = items.map((i) => parseInt(i.id)).join(',');

    await db.sequelize.query(
      `UPDATE vendors SET menu_order = CASE id ${cases} END WHERE id IN (${ids})`,
    );

    return res.json({
      success: true,
      message: `Updated menu_order for ${items.length} vendors`,
      count: items.length,
    });
  } catch (error) {
    console.error('Admin vendor updateMenuOrder error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
