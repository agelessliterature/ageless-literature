/**
 * Vendor Controller
 * Handles vendor application and profile management
 */

import db from '../models/index.js';
import { Op } from 'sequelize';
import { sendTemplatedEmail } from '../services/emailService.js';

const { Vendor, User, Book, Product, Order, OrderItem, VendorEarning, sequelize } = db;

/**
 * Submit vendor application
 * POST /api/vendor/apply
 * Body: { shopName, shopUrl, phoneNumber, businessDescription, sampleFiles, websiteUrl, businessAddress, taxId, agreedToTerms }
 */
export const applyAsVendor = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Check if user already has a vendor profile
    const existingVendor = await Vendor.findOne({ where: { userId } });

    if (existingVendor) {
      return res.status(400).json({
        success: false,
        message: 'Vendor profile already exists',
        data: { status: existingVendor.status },
      });
    }

    const {
      shopName,
      shopUrl,
      phoneNumber,
      businessDescription,
      sampleFiles,
      websiteUrl,
      businessAddress,
      taxId,
      preferredPayoutMethod,
      agreedToTerms,
    } = req.body;

    // Validation
    if (!shopName || !shopUrl || !businessDescription) {
      return res.status(400).json({
        success: false,
        message: 'Shop name, shop URL, and business description are required',
      });
    }

    if (!agreedToTerms) {
      return res.status(400).json({
        success: false,
        message: 'You must agree to the terms and conditions',
      });
    }

    // Check if shopUrl is already taken
    const urlTaken = await Vendor.findOne({ where: { shopUrl } });
    if (urlTaken) {
      return res.status(400).json({
        success: false,
        message: 'Shop URL is already taken',
      });
    }

    // Create vendor profile with pending status
    const vendor = await Vendor.create({
      userId,
      shopName,
      shopUrl,
      slug: shopUrl, // Duplicate for legacy compatibility
      storeName: shopName, // Duplicate for legacy compatibility
      phoneNumber,
      businessDescription,
      bio: businessDescription, // Duplicate for legacy compatibility
      sampleFiles: sampleFiles || [],
      websiteUrl,
      businessAddress,
      taxId,
      preferredPayoutMethod,
      status: 'pending',
      agreedToTerms,
      termsAgreedAt: new Date(),
      commissionRate: 0.08, // 8% platform commission
    });

    // Get user info for email
    const user = await User.findByPk(userId);

    // Send confirmation email
    await sendTemplatedEmail('vendor-application-submitted', user.email, {
      firstName: user.firstName,
      lastName: user.lastName,
      shopName,
      applicationDate: new Date().toLocaleDateString(),
    });

    return res.status(201).json({
      success: true,
      message: 'Vendor application submitted successfully',
      data: vendor,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to submit vendor application',
      error: error.message,
    });
  }
};

/**
 * Get current user's vendor profile
 * GET /api/vendor/profile
 */
export const getVendorProfile = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const vendor = await Vendor.findOne({
      where: { userId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'firstName', 'lastName', 'phoneNumber'],
        },
      ],
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    // Calculate earnings summary - use findAll for aggregates
    const earningsSummaryResult = await VendorEarning.findAll({
      where: { vendorId: vendor.id },
      attributes: [
        [
          db.sequelize.fn('COALESCE', db.sequelize.fn('SUM', db.sequelize.col('net_amount')), 0),
          'totalEarnings',
        ],
        [
          db.sequelize.fn('COALESCE', db.sequelize.fn('SUM', db.sequelize.col('platform_fee')), 0),
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

    const earningsSummary = earningsSummaryResult[0] || {
      totalEarnings: 0,
      totalCommission: 0,
      totalGross: 0,
      totalTransactions: 0,
    };

    return res.json({
      success: true,
      data: {
        ...vendor.toJSON(),
        earningsSummary,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve vendor profile',
      error: error.message,
    });
  }
};

/**
 * Get vendor earnings/transactions
 * GET /api/vendor/earnings
 * Query: page, limit, status
 */
export const getVendorEarnings = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { page = 1, limit = 20, status } = req.query;

    const vendor = await Vendor.findOne({ where: { userId } });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    const where = { vendorId: vendor.id };
    if (status) where.status = status;

    const { count, rows } = await VendorEarning.findAndCountAll({
      where,
      include: [
        {
          model: Order,
          as: 'order',
          attributes: ['orderNumber', 'status', 'createdAt'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    // Compute summary from all earnings for this vendor (not just current page)
    const summaryWhere = { vendorId: vendor.id };
    const [totalEarningsResult, grossSalesResult, completedCount, pendingCount] = await Promise.all(
      [
        VendorEarning.sum('net_amount', { where: summaryWhere }) || 0,
        VendorEarning.sum('amount', { where: summaryWhere }) || 0,
        VendorEarning.count({ where: { ...summaryWhere, status: 'completed' } }),
        VendorEarning.count({ where: { ...summaryWhere, status: 'pending' } }),
      ],
    );

    return res.json({
      success: true,
      data: {
        earnings: rows,
        summary: {
          totalEarnings: totalEarningsResult || 0,
          grossSales: grossSalesResult || 0,
          completedCount,
          pendingCount,
        },
        pagination: {
          total: count,
          currentPage: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve earnings',
      error: error.message,
    });
  }
};

/**
 * Update vendor profile
 * PATCH /api/vendor/profile
 * Body: { shopName, businessDescription, phoneNumber, websiteUrl, etc. }
 */
export const updateVendorProfile = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;

    const vendor = await Vendor.findOne({ where: { userId } });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    const allowedUpdates = [
      'shopName',
      'businessDescription',
      'phoneNumber',
      'websiteUrl',
      'businessAddress',
      'taxId',
      'preferredPayoutMethod',
      'sampleFiles',
    ];

    const updates = {};
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // If shopName updated, sync to storeName (legacy)
    if (updates.shopName) updates.storeName = updates.shopName;
    if (updates.businessDescription) updates.bio = updates.businessDescription;

    await vendor.update(updates);

    return res.json({
      success: true,
      message: 'Vendor profile updated successfully',
      data: vendor,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update vendor profile',
      error: error.message,
    });
  }
};

/**
 * Get vendor inventory (products + auctions)
 * GET /api/vendor/inventory
 * Query: type (products, auctions, all), page, limit
 */
export const getVendorInventory = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { type = 'all', page = 1, limit = 20 } = req.query;

    const vendor = await Vendor.findOne({ where: { userId } });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get products (books)
    let products = [];
    let productCount = 0;
    if (type === 'all' || type === 'products') {
      const productResult = await Book.findAndCountAll({
        where: { vendorId: vendor.id },
        order: [['createdAt', 'DESC']],
        limit: type === 'products' ? parseInt(limit) : undefined,
        offset: type === 'products' ? offset : undefined,
      });
      products = productResult.rows;
      productCount = productResult.count;
    }

    // Get auctions
    let auctions = [];
    let auctionCount = 0;
    if (type === 'all' || type === 'auctions') {
      const { Auction } = db;
      const auctionResult = await Auction.findAndCountAll({
        where: { vendorId: vendor.id },
        order: [['createdAt', 'DESC']],
        limit: type === 'auctions' ? parseInt(limit) : undefined,
        offset: type === 'auctions' ? offset : undefined,
      });
      auctions = auctionResult.rows;
      auctionCount = auctionResult.count;
    }

    return res.json({
      success: true,
      data: {
        products,
        auctions,
      },
      counts: {
        products: productCount,
        auctions: auctionCount,
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve inventory',
      error: error.message,
    });
  }
};

/**
 * Get vendor dashboard stats
 * GET /api/vendor/dashboard
 */
export const getVendorDashboard = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;

    const vendor = await Vendor.findOne({
      where: { userId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'firstName', 'lastName'],
        },
      ],
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    // Get earnings summary
    const earningsSummaryResult = await VendorEarning.findAll({
      where: { vendorId: vendor.id },
      attributes: [
        [
          db.sequelize.fn('COALESCE', db.sequelize.fn('SUM', db.sequelize.col('net_amount')), 0),
          'totalEarnings',
        ],
        [
          db.sequelize.fn('COALESCE', db.sequelize.fn('SUM', db.sequelize.col('platform_fee')), 0),
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

    const earningsSummary = earningsSummaryResult[0] || {
      totalEarnings: 0,
      totalCommission: 0,
      totalGross: 0,
      totalTransactions: 0,
    };

    // Get inventory counts
    const productCount = await Book.count({ where: { vendor_id: vendor.id } });
    const { Auction, VendorPayout, VendorWithdrawal } = db;
    const auctionCount = Auction
      ? await Auction.count({ where: { vendorId: vendor.id, status: 'active' } })
      : 0;

    // Get pending orders count from VendorEarnings with pending/processing orders
    const pendingOrdersCount = await VendorEarning.count({
      where: { vendorId: vendor.id },
      include: [
        {
          model: Order,
          as: 'order',
          where: {
            status: { [Op.in]: ['pending', 'processing', 'confirmed'] },
          },
        },
      ],
    });

    // Get recent sales
    const recentSales = await VendorEarning.findAll({
      where: { vendorId: vendor.id },
      include: [
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'orderNumber', 'status', 'totalAmount'],
          include: [
            {
              model: OrderItem,
              as: 'items',
              attributes: ['id', 'title', 'quantity', 'price'],
              include: [
                {
                  model: Book,
                  as: 'book',
                  attributes: ['id', 'title', 'slug'],
                  required: false,
                },
                {
                  model: Product,
                  as: 'product',
                  attributes: ['id', 'title', 'slug'],
                  required: false,
                },
              ],
            },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: 5,
    });

    // Get last payout
    const lastPayout = VendorPayout
      ? await VendorPayout.findOne({
          where: { vendorId: vendor.id, status: 'completed' },
          order: [['processedAt', 'DESC']],
          attributes: ['amount', 'processedAt', 'method'],
        })
      : null;

    // Get recent earnings (last 10)
    const recentEarnings = await VendorEarning.findAll({
      where: { vendorId: vendor.id },
      include: [
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'orderNumber', 'status'],
          include: [
            {
              model: OrderItem,
              as: 'items',
              attributes: ['id', 'title', 'quantity', 'price'],
              include: [
                {
                  model: Book,
                  as: 'book',
                  attributes: ['id', 'title', 'slug'],
                  required: false,
                },
                {
                  model: Product,
                  as: 'product',
                  attributes: ['id', 'title', 'slug'],
                  required: false,
                },
              ],
            },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: 10,
    });

    // Get recent payouts (last 5)
    const recentPayouts = VendorPayout
      ? await VendorPayout.findAll({
          where: { vendorId: vendor.id },
          order: [['createdAt', 'DESC']],
          limit: 5,
        })
      : [];

    // Get recent withdrawals (last 5)
    const recentWithdrawals = VendorWithdrawal
      ? await VendorWithdrawal.findAll({
          where: { vendorId: vendor.id },
          order: [['createdAt', 'DESC']],
          limit: 5,
        })
      : [];

    // Calculate conversion rate (if we have view stats)
    const conversionRate =
      productCount > 0 && earningsSummary.totalTransactions > 0
        ? ((earningsSummary.totalTransactions / productCount) * 100).toFixed(2)
        : '0.00';

    return res.json({
      success: true,
      data: {
        vendor: {
          id: vendor.id,
          shopName: vendor.shopName,
          shopUrl: vendor.shopUrl,
          status: vendor.status,
          logoUrl: vendor.logoUrl,
          bannerUrl: vendor.bannerUrl,
          balanceAvailable: vendor.balanceAvailable,
          balancePending: vendor.balancePending,
          lifetimeGrossSales: vendor.lifetimeGrossSales,
          lifetimeCommissionTaken: vendor.lifetimeCommissionTaken,
          lifetimeVendorEarnings: vendor.lifetimeVendorEarnings,
          commissionRate: vendor.commissionRate,
          rating: vendor.rating,
          totalSales: vendor.totalSales,
          rejectionReason: vendor.rejectionReason,
        },
        stats: {
          activeListingsCount: productCount,
          auctionCount,
          pendingOrdersCount,
          conversionRate: parseFloat(conversionRate),
        },
        payoutSettings: {
          stripeAccountId: vendor.stripeAccountId || null,
          stripeAccountStatus: vendor.stripeAccountStatus || null,
          payoutMethod: vendor.payoutMethod || null,
          paypalEmail: vendor.paypalEmail || null,
        },
        earningsSummary,
        inventory: {
          products: productCount,
          auctions: auctionCount,
        },
        lastPayout,
        recentSales,
        recentEarnings,
        recentPayouts,
        recentWithdrawals,
      },
    });
  } catch (error) {
    console.error('Get vendor dashboard error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard data',
      error: error.message,
    });
  }
};

/**
 * Update vendor payout method
 * PATCH /api/vendor/payout-method
 * Body: { payoutMethod: 'stripe' | 'paypal' }
 */
export const updatePayoutMethod = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { payoutMethod } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Validate payout method
    if (!['stripe', 'paypal'].includes(payoutMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payout method. Must be "stripe" or "paypal"',
      });
    }

    // Get vendor
    const vendor = await Vendor.findOne({ where: { userId } });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    // Additional validation for Stripe
    if (payoutMethod === 'stripe' && !vendor.stripeAccountId) {
      return res.status(400).json({
        success: false,
        message: 'You must connect a Stripe account before selecting Stripe as your payout method',
      });
    }

    // Additional validation for PayPal
    if (payoutMethod === 'paypal' && !vendor.paypalEmail) {
      return res.status(400).json({
        success: false,
        message: 'You must add a PayPal email before selecting PayPal as your payout method',
      });
    }

    // Update payout method
    vendor.payoutMethod = payoutMethod;
    await vendor.save();

    return res.status(200).json({
      success: true,
      message: 'Payout method updated successfully',
      data: {
        payoutMethod: vendor.payoutMethod,
      },
    });
  } catch (error) {
    console.error('Update payout method error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update payout method',
      error: error.message,
    });
  }
};

/**
 * Update vendor PayPal email
 * PATCH /api/vendor/paypal-email
 * Body: { paypalEmail: string }
 */
export const updatePayPalEmail = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { paypalEmail } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!paypalEmail || !emailRegex.test(paypalEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
    }

    // Get vendor
    const vendor = await Vendor.findOne({ where: { userId } });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    // Update PayPal email
    vendor.paypalEmail = paypalEmail;
    await vendor.save();

    return res.status(200).json({
      success: true,
      message: 'PayPal email updated successfully',
      data: {
        paypalEmail: vendor.paypalEmail,
      },
    });
  } catch (error) {
    console.error('Update PayPal email error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update PayPal email',
      error: error.message,
    });
  }
};

/**
 * Get vendor payout settings
 * GET /api/vendor/payout-settings
 */
export const getPayoutSettings = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Get vendor
    const vendor = await Vendor.findOne({ where: { userId } });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        payoutMethod: vendor.payoutMethod,
        stripeAccountId: vendor.stripeAccountId,
        stripeAccountStatus: vendor.stripeAccountStatus,
        paypalEmail: vendor.paypalEmail,
        balanceAvailable: parseFloat(vendor.balanceAvailable || 0),
        balancePending: parseFloat(vendor.balancePending || 0),
        balancePaid: parseFloat(vendor.balancePaid || 0),
      },
    });
  } catch (error) {
    console.error('Get payout settings error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve payout settings',
      error: error.message,
    });
  }
};

/**
 * Get all active vendors (public endpoint)
 * GET /api/vendors
 * Query: featured (boolean), page, limit
 */
export const getPublicVendors = async (req, res) => {
  try {
    const {
      featured,
      page = 1,
      limit = 20,
      search,
      sortBy = 'menuOrder',
      sortOrder = 'ASC',
    } = req.query;
    const now = new Date();

    const where = {
      status: 'approved', // Only show approved vendors
    };

    // Filter for featured vendors if requested
    if (featured === 'true') {
      where.isFeatured = true;
      // Check if featured period is active (started and not ended)
      where[Op.and] = [
        {
          [Op.or]: [{ featuredStartDate: null }, { featuredStartDate: { [Op.lte]: now } }],
        },
        {
          [Op.or]: [{ featuredEndDate: null }, { featuredEndDate: { [Op.gte]: now } }],
        },
      ];
    }

    // Add search filter
    if (search) {
      where[Op.or] = [
        { shopName: { [Op.iLike]: `%${search}%` } },
        { businessDescription: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Map URL-friendly sort params to Sequelize attribute names
    const sortByMap = {
      menu_order: 'menuOrder',
      menuOrder: 'menuOrder',
      'menu-order': 'menuOrder',
      shopName: 'shopName',
      shop_name: 'shopName',
      createdAt: 'createdAt',
      created_at: 'createdAt',
      isFeatured: 'isFeatured',
      is_featured: 'isFeatured',
      featuredPriority: 'featuredPriority',
      featured_priority: 'featuredPriority',
    };

    // Determine sorting
    let order;
    if (
      featured === 'true' &&
      (sortBy === 'shopName' || sortBy === 'menuOrder' || sortBy === 'menu_order')
    ) {
      // For featured vendors, prioritize by featuredPriority, then by requested sort
      const mappedSort = sortByMap[sortBy] || 'menuOrder';
      const sortDirection = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

      // Convert to column names
      const attributeToColumn = {
        menuOrder: 'menu_order',
        shopName: 'shop_name',
      };
      const sortColumn = attributeToColumn[mappedSort] || mappedSort;

      order = [
        [sequelize.col('featured_priority'), 'DESC'],
        [sequelize.col(sortColumn), sortDirection],
      ];
    } else {
      // Use requested sort with mapping
      const validSortFields = [
        'shopName',
        'createdAt',
        'isFeatured',
        'menuOrder',
        'featuredPriority',
      ];
      const mappedSort = sortByMap[sortBy] || 'menuOrder';
      const sortField = validSortFields.includes(mappedSort) ? mappedSort : 'menuOrder';
      const sortDirection = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

      // Convert attribute names to actual column names for ORDER BY
      const attributeToColumn = {
        menuOrder: 'menu_order',
        shopName: 'shop_name',
        createdAt: 'created_at',
        isFeatured: 'is_featured',
        featuredPriority: 'featured_priority',
      };

      const columnName = attributeToColumn[sortField] || sortField;
      order = [[sequelize.col(columnName), sortDirection]];

      // Add secondary sort by menu_order then shop_name for consistency
      if (sortField !== 'menuOrder') {
        order.push([sequelize.col('menu_order'), 'ASC']);
      }
      if (sortField !== 'shopName') {
        order.push([sequelize.col('shop_name'), 'ASC']);
      }
    }

    const { count, rows } = await Vendor.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
      attributes: [
        'id',
        'shopName',
        'shopUrl',
        'businessDescription',
        'logoUrl',
        'bannerUrl',
        'websiteUrl',
        'socialFacebook',
        'socialTwitter',
        'socialInstagram',
        'socialLinkedin',
        'isFeatured',
        'featuredPriority',
        ['menu_order', 'menuOrder'],
        'createdAt',
      ],
      order,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
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
    console.error('Get public vendors error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve vendors',
      error: error.message,
    });
  }
};

/**
 * Get vendor by shop URL (public endpoint)
 * GET /api/vendors/:shopUrl
 */
export const getVendorByShopUrl = async (req, res) => {
  try {
    const { shopUrl } = req.params;

    const vendor = await Vendor.findOne({
      where: {
        shopUrl,
        status: 'approved',
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName'],
        },
      ],
      attributes: [
        'id',
        'shopName',
        'shopUrl',
        'businessDescription',
        'logoUrl',
        'bannerUrl',
        'websiteUrl',
        'socialFacebook',
        'socialTwitter',
        'socialInstagram',
        'socialLinkedin',
        'createdAt',
      ],
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    return res.json({
      success: true,
      data: vendor,
      message: 'Vendor retrieved successfully',
    });
  } catch (error) {
    console.error('Get vendor by shop URL error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve vendor',
      error: error.message,
    });
  }
};

/**
 * Get vendor payouts
 * GET /api/vendor/payouts
 * Query: page, limit, status
 */
export const getVendorPayouts = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { page = 1, limit = 20, status } = req.query;

    const vendor = await Vendor.findOne({ where: { userId } });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    const { VendorPayout } = db;
    if (!VendorPayout) {
      return res.status(200).json({
        success: true,
        data: {
          payouts: [],
          pagination: {
            total: 0,
            totalPages: 0,
            currentPage: parseInt(page),
            perPage: parseInt(limit),
            hasNextPage: false,
            hasPrevPage: false,
          },
        },
      });
    }

    const where = { vendorId: vendor.id };
    if (status) {
      where.status = status;
    }

    const { count, rows } = await VendorPayout.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    return res.json({
      success: true,
      data: {
        payouts: rows,
        pagination: {
          total: count,
          totalPages: Math.ceil(count / parseInt(limit)),
          currentPage: parseInt(page),
          perPage: parseInt(limit),
          hasNextPage: parseInt(page) < Math.ceil(count / parseInt(limit)),
          hasPrevPage: parseInt(page) > 1,
        },
      },
      message: 'Payouts retrieved successfully',
    });
  } catch (error) {
    console.error('Get vendor payouts error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve payouts',
      error: error.message,
    });
  }
};

/**
 * Check if user is a vendor
 * GET /api/vendor/status
 * Returns basic vendor status for UI purposes
 */
export const getVendorStatus = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;

    if (!userId) {
      return res.json({
        success: true,
        data: {
          isVendor: false,
          status: null,
        },
      });
    }

    const vendor = await Vendor.findOne({
      where: { userId },
      attributes: ['id', 'shopName', 'shopUrl', 'status', 'logoUrl'],
    });

    if (!vendor) {
      return res.json({
        success: true,
        data: {
          isVendor: false,
          status: null,
        },
      });
    }

    const isActive = vendor.status === 'approved';

    return res.json({
      success: true,
      data: {
        isVendor: true,
        status: vendor.status,
        shopName: vendor.shopName,
        shopUrl: vendor.shopUrl,
        logoUrl: vendor.logoUrl,
        isActive: isActive,
      },
    });
  } catch (error) {
    console.error('Get vendor status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check vendor status',
      error: error.message,
    });
  }
};

/**
 * Get public vendor profile by shopUrl
 * GET /vendors/:shopUrl (public)
 */
export const getPublicVendorProfile = async (req, res) => {
  try {
    const { shopUrl } = req.params;

    const vendor = await Vendor.findOne({
      where: {
        shopUrl,
        status: 'approved', // Only show approved vendors
      },
      attributes: [
        'id',
        'shopName',
        'shopUrl',
        'businessDescription',
        'businessEmail',
        'logoUrl',
        'bannerUrl',
        'createdAt',
      ],
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    return res.json({
      success: true,
      data: {
        id: vendor.id,
        shopName: vendor.shopName,
        shopUrl: vendor.shopUrl,
        description: vendor.businessDescription,
        businessEmail: vendor.businessEmail,
        logoUrl: vendor.logoUrl,
        bannerUrl: vendor.bannerUrl,
        createdAt: vendor.createdAt,
      },
    });
  } catch (error) {
    console.error('Get public vendor profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor profile',
      error: error.message,
    });
  }
};
