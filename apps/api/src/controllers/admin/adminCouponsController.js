/**
 * Admin Coupons Controller
 * Full CRUD for admin-managed coupons
 */
import { Op } from 'sequelize';
import db from '../../models/index.js';

const { Coupon, CouponRedemption, User, Order, Vendor } = db;

/**
 * GET /admin/coupons
 * List all coupons with filtering, sorting, pagination
 */
export const listAll = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      discountType,
      sort = 'createdAt',
      order = 'DESC',
    } = req.query;

    const where = {};

    if (search) {
      where[Op.or] = [
        { code: { [Op.iLike]: `%${search}%` } },
        { name: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (status === 'active') {
      where.isActive = true;
      where[Op.or] = [{ expiresAt: null }, { expiresAt: { [Op.gt]: new Date() } }];
    } else if (status === 'inactive') {
      where.isActive = false;
    } else if (status === 'expired') {
      where.expiresAt = { [Op.lt]: new Date() };
    }

    if (discountType) {
      where.discountType = discountType;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { rows: coupons, count: total } = await Coupon.findAndCountAll({
      where,
      include: [{ model: Vendor, as: 'vendor', attributes: ['id', 'businessName'] }],
      order: [[sort, order.toUpperCase()]],
      limit: parseInt(limit),
      offset,
    });

    // Get redemption counts for each coupon
    const couponIds = coupons.map((c) => c.id);
    const redemptionCounts = await CouponRedemption.findAll({
      attributes: [
        'couponId',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
        [db.sequelize.fn('SUM', db.sequelize.col('discount_amount')), 'totalDiscount'],
      ],
      where: { couponId: { [Op.in]: couponIds } },
      group: ['couponId'],
      raw: true,
    });

    const redemptionMap = {};
    for (const r of redemptionCounts) {
      redemptionMap[r.couponId] = {
        redemptionCount: parseInt(r.count),
        totalDiscount: parseFloat(r.totalDiscount) || 0,
      };
    }

    const couponsWithStats = coupons.map((c) => ({
      ...c.toJSON(),
      redemptionCount: redemptionMap[c.id]?.redemptionCount || 0,
      totalDiscountGiven: redemptionMap[c.id]?.totalDiscount || 0,
    }));

    res.json({
      success: true,
      data: {
        coupons: couponsWithStats,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Error listing coupons:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /admin/coupons/:id
 * Get single coupon with redemption history
 */
export const getOne = async (req, res) => {
  try {
    const { id } = req.params;

    const coupon = await Coupon.findByPk(id, {
      include: [
        { model: Vendor, as: 'vendor', attributes: ['id', 'businessName'] },
        {
          model: CouponRedemption,
          as: 'redemptions',
          include: [
            { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
            { model: Order, as: 'order', attributes: ['id', 'orderNumber', 'totalAmount'] },
          ],
          order: [['createdAt', 'DESC']],
          limit: 50,
        },
      ],
    });

    if (!coupon) {
      return res.status(404).json({ success: false, error: 'Coupon not found' });
    }

    // Get aggregate stats
    const stats = await CouponRedemption.findOne({
      attributes: [
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'totalRedemptions'],
        [db.sequelize.fn('SUM', db.sequelize.col('discount_amount')), 'totalDiscount'],
      ],
      where: { couponId: id },
      raw: true,
    });

    res.json({
      success: true,
      data: {
        ...coupon.toJSON(),
        stats: {
          totalRedemptions: parseInt(stats?.totalRedemptions) || 0,
          totalDiscount: parseFloat(stats?.totalDiscount) || 0,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /admin/coupons
 * Create a new coupon
 */
export const create = async (req, res) => {
  try {
    const {
      code,
      name,
      description,
      discountType,
      discountValue,
      minimumOrderAmount,
      maximumDiscountAmount,
      usageLimit,
      perUserLimit,
      startsAt,
      expiresAt,
      isActive,
      vendorId,
      scope,
      appliesTo,
      stackable,
    } = req.body;

    // Validate required fields
    if (!code || !name || !discountType) {
      return res.status(400).json({
        success: false,
        error: 'Code, name, and discount type are required',
      });
    }

    if (discountType !== 'free_shipping' && (!discountValue || discountValue <= 0)) {
      return res.status(400).json({
        success: false,
        error: 'Discount value must be greater than 0',
      });
    }

    if (discountType === 'percentage' && discountValue > 100) {
      return res.status(400).json({
        success: false,
        error: 'Percentage discount cannot exceed 100%',
      });
    }

    // Check for duplicate code
    const existing = await Coupon.findOne({ where: { code: code.toUpperCase().trim() } });
    if (existing) {
      return res
        .status(400)
        .json({ success: false, error: 'A coupon with this code already exists' });
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase().trim(),
      name,
      description,
      discountType,
      discountValue: discountType === 'free_shipping' ? 0 : discountValue,
      minimumOrderAmount: minimumOrderAmount || null,
      maximumDiscountAmount: maximumDiscountAmount || null,
      usageLimit: usageLimit || null,
      perUserLimit: perUserLimit || 1,
      startsAt: startsAt || null,
      expiresAt: expiresAt || null,
      isActive: isActive !== false,
      vendorId: vendorId || null,
      scope: scope || 'global',
      appliesTo: appliesTo || null,
      stackable: stackable || false,
      createdByType: 'admin',
      createdById: req.user?.userId,
    });

    res.status(201).json({ success: true, data: coupon });
  } catch (error) {
    console.error('Error creating coupon:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * PUT /admin/coupons/:id
 * Update an existing coupon
 */
export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findByPk(id);

    if (!coupon) {
      return res.status(404).json({ success: false, error: 'Coupon not found' });
    }

    const {
      code,
      name,
      description,
      discountType,
      discountValue,
      minimumOrderAmount,
      maximumDiscountAmount,
      usageLimit,
      perUserLimit,
      startsAt,
      expiresAt,
      isActive,
      vendorId,
      scope,
      appliesTo,
      stackable,
    } = req.body;

    // Check for duplicate code if changing
    if (code && code.toUpperCase().trim() !== coupon.code) {
      const existing = await Coupon.findOne({
        where: { code: code.toUpperCase().trim(), id: { [Op.ne]: id } },
      });
      if (existing) {
        return res
          .status(400)
          .json({ success: false, error: 'A coupon with this code already exists' });
      }
    }

    await coupon.update({
      code: code ? code.toUpperCase().trim() : coupon.code,
      name: name !== undefined ? name : coupon.name,
      description: description !== undefined ? description : coupon.description,
      discountType: discountType || coupon.discountType,
      discountValue: discountValue !== undefined ? discountValue : coupon.discountValue,
      minimumOrderAmount:
        minimumOrderAmount !== undefined ? minimumOrderAmount : coupon.minimumOrderAmount,
      maximumDiscountAmount:
        maximumDiscountAmount !== undefined ? maximumDiscountAmount : coupon.maximumDiscountAmount,
      usageLimit: usageLimit !== undefined ? usageLimit : coupon.usageLimit,
      perUserLimit: perUserLimit !== undefined ? perUserLimit : coupon.perUserLimit,
      startsAt: startsAt !== undefined ? startsAt : coupon.startsAt,
      expiresAt: expiresAt !== undefined ? expiresAt : coupon.expiresAt,
      isActive: isActive !== undefined ? isActive : coupon.isActive,
      vendorId: vendorId !== undefined ? vendorId : coupon.vendorId,
      scope: scope || coupon.scope,
      appliesTo: appliesTo !== undefined ? appliesTo : coupon.appliesTo,
      stackable: stackable !== undefined ? stackable : coupon.stackable,
    });

    res.json({ success: true, data: coupon });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * DELETE /admin/coupons/:id
 * Delete a coupon (soft - just deactivates if has redemptions)
 */
export const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findByPk(id);

    if (!coupon) {
      return res.status(404).json({ success: false, error: 'Coupon not found' });
    }

    // Check if coupon has been redeemed
    const redemptionCount = await CouponRedemption.count({ where: { couponId: id } });

    if (redemptionCount > 0) {
      // Soft delete - just deactivate
      await coupon.update({ isActive: false });
      return res.json({
        success: true,
        message: 'Coupon deactivated (has redemption history)',
      });
    }

    // Hard delete
    await coupon.destroy();
    res.json({ success: true, message: 'Coupon deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /admin/coupons/stats
 * Get overall coupon statistics
 */
export const getStats = async (req, res) => {
  try {
    const totalCoupons = await Coupon.count();
    const activeCoupons = await Coupon.count({
      where: {
        isActive: true,
        [Op.or]: [{ expiresAt: null }, { expiresAt: { [Op.gt]: new Date() } }],
      },
    });

    const redemptionStats = await CouponRedemption.findOne({
      attributes: [
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'totalRedemptions'],
        [db.sequelize.fn('SUM', db.sequelize.col('discount_amount')), 'totalDiscount'],
      ],
      raw: true,
    });

    res.json({
      success: true,
      data: {
        totalCoupons,
        activeCoupons,
        totalRedemptions: parseInt(redemptionStats?.totalRedemptions) || 0,
        totalDiscountGiven: parseFloat(redemptionStats?.totalDiscount) || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
