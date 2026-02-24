/**
 * Admin Commissions Controller
 * Shows platform commission income from all vendor sales and auctions.
 * Regular sales: 8% (800 bps)
 * Auctions:      5% (500 bps)
 */

import db from '../../models/index.js';
import { Op } from 'sequelize';

const { VendorEarning, Vendor, Order, User } = db;

/**
 * GET /api/admin/commissions
 * Query: page, limit, status, transactionType, search (vendor name)
 */
export const listCommissions = async (req, res) => {
  try {
    const { page = 1, limit = 30, status, transactionType, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status && status !== 'all') where.status = status;
    if (transactionType && transactionType !== 'all') where.transactionType = transactionType;

    const vendorWhere = {};
    if (search) vendorWhere.storeName = { [Op.iLike]: `%${search}%` };

    const { count, rows } = await VendorEarning.findAndCountAll({
      where,
      include: [
        {
          model: Vendor,
          as: 'vendor',
          attributes: ['id', 'storeName'],
          where: Object.keys(vendorWhere).length ? vendorWhere : undefined,
          required: !!Object.keys(vendorWhere).length,
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName', 'email'],
            },
          ],
        },
        {
          model: Order,
          as: 'order',
          required: false,
          attributes: ['id', 'orderNumber', 'status', 'createdAt'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
      distinct: true,
    });

    // Overall summary (all time, not filtered)
    const [summary] = await db.sequelize.query(`
      SELECT
        COALESCE(SUM(platform_fee), 0)::numeric                              AS total_fees,
        COALESCE(SUM(amount), 0)::numeric                                    AS total_gross,
        COALESCE(SUM(net_amount), 0)::numeric                                AS total_net,
        COALESCE(SUM(CASE WHEN transaction_type = 'auction' THEN platform_fee ELSE 0 END), 0)::numeric AS auction_fees,
        COALESCE(SUM(CASE WHEN transaction_type != 'auction' OR transaction_type IS NULL THEN platform_fee ELSE 0 END), 0)::numeric AS sale_fees,
        COUNT(*)::int                                                         AS total_count,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::int                AS completed_count,
        COUNT(CASE WHEN status = 'pending' THEN 1 END)::int                  AS pending_count
      FROM vendor_earnings
    `);

    return res.json({
      success: true,
      data: {
        commissions: rows,
        summary: summary[0],
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching admin commissions:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve commissions',
      error: error.message,
    });
  }
};
