/**
 * Vendor Coupons Controller
 * CRUD for vendor-specific coupons (scoped to vendor's products only)
 */
import { Op } from 'sequelize';
import db from '../models/index.js';

const { Coupon, CouponRedemption, User, Order } = db;

/**
 * GET /vendor/coupons
 * List vendor's own coupons
 */
export const getVendorCoupons = async (req, res) => {
  try {
    const vendorId = req.vendorId || req.vendor?.id;
    const { page = 1, limit = 20, search, status } = req.query;

    const where = { vendorId };

    if (search) {
      where[Op.or] = [
        { code: { [Op.iLike]: `%${search}%` } },
        { name: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    } else if (status === 'expired') {
      where.expiresAt = { [Op.lt]: new Date() };
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { rows: coupons, count: total } = await Coupon.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    // Get redemption counts
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
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /vendor/coupons/:id
 * Get single vendor coupon with redemption history
 */
export const getVendorCoupon = async (req, res) => {
  try {
    const vendorId = req.vendorId || req.vendor?.id;
    const { id } = req.params;

    const coupon = await Coupon.findOne({
      where: { id, vendorId },
      include: [
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

    res.json({ success: true, data: coupon });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /vendor/coupons
 * Create a new vendor coupon (always scoped to vendor)
 */
export const createVendorCoupon = async (req, res) => {
  try {
    const vendorId = req.vendorId || req.vendor?.id;

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
      appliesTo,
    } = req.body;

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

    // Vendors can only create vendor-scoped coupons
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
      vendorId,
      scope: 'vendor',
      appliesTo: appliesTo || null,
      stackable: false, // Vendor coupons are not stackable
      createdByType: 'vendor',
      createdById: vendorId,
    });

    res.status(201).json({ success: true, data: coupon });
  } catch (error) {
    console.error('Error creating vendor coupon:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * PUT /vendor/coupons/:id
 * Update a vendor coupon
 */
export const updateVendorCoupon = async (req, res) => {
  try {
    const vendorId = req.vendorId || req.vendor?.id;
    const { id } = req.params;

    const coupon = await Coupon.findOne({ where: { id, vendorId } });
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
      appliesTo,
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
      appliesTo: appliesTo !== undefined ? appliesTo : coupon.appliesTo,
    });

    res.json({ success: true, data: coupon });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * DELETE /vendor/coupons/:id
 * Delete a vendor coupon
 */
export const deleteVendorCoupon = async (req, res) => {
  try {
    const vendorId = req.vendorId || req.vendor?.id;
    const { id } = req.params;

    const coupon = await Coupon.findOne({ where: { id, vendorId } });
    if (!coupon) {
      return res.status(404).json({ success: false, error: 'Coupon not found' });
    }

    const redemptionCount = await CouponRedemption.count({ where: { couponId: id } });

    if (redemptionCount > 0) {
      await coupon.update({ isActive: false });
      return res.json({
        success: true,
        message: 'Coupon deactivated (has redemption history)',
      });
    }

    await coupon.destroy();
    res.json({ success: true, message: 'Coupon deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
