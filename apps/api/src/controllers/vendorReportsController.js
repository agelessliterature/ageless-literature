/**
 * Vendor Reports Controller
 * Handles vendor analytics and reporting
 */

import db from '../models/index.js';
import { Op } from 'sequelize';

const { Vendor, Order, OrderItem, Book, VendorEarning, sequelize } = db;

/**
 * Get summary statistics
 * GET /api/vendor/reports/summary
 */
export const getSummary = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { period = '30' } = req.query; // days

    const vendor = await Vendor.findOne({ where: { userId } });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    const periodDate = new Date();
    periodDate.setDate(periodDate.getDate() - parseInt(period));

    // Get period orders
    const periodOrders = await Order.findAll({
      include: [
        {
          model: OrderItem,
          as: 'items',
          required: true,
          include: [
            {
              model: Book,
              as: 'book',
              where: { vendorId: vendor.id },
              required: true,
            },
          ],
        },
      ],
      where: {
        createdAt: { [Op.gte]: periodDate },
        status: { [Op.in]: ['paid', 'processing', 'shipped', 'delivered'] },
      },
    });

    // Calculate metrics
    let periodRevenue = 0;
    let periodCommission = 0;
    let periodOrdersCount = periodOrders.length;

    periodOrders.forEach((order) => {
      order.items.forEach((item) => {
        if (item.book?.vendorId === vendor.id) {
          const itemTotal = parseFloat(item.price) * item.quantity;
          periodRevenue += itemTotal;
          periodCommission += itemTotal * 0.08;
        }
      });
    });

    const periodEarnings = periodRevenue - periodCommission;

    // Get total books count
    const totalBooks = await Book.count({
      where: { vendorId: vendor.id },
    });

    // Get pending orders
    const pendingOrders = await Order.count({
      include: [
        {
          model: OrderItem,
          as: 'items',
          required: true,
          include: [
            {
              model: Book,
              as: 'book',
              where: { vendorId: vendor.id },
              required: true,
            },
          ],
        },
      ],
      where: {
        status: { [Op.in]: ['pending', 'processing'] },
      },
      distinct: true,
    });

    // Average order value
    const avgOrderValue = periodOrdersCount > 0 ? periodRevenue / periodOrdersCount : 0;

    // Conversion rate (placeholder - would need views data)
    const conversionRate = 0;

    return res.json({
      success: true,
      data: {
        period: parseInt(period),
        periodRevenue: periodRevenue.toFixed(2),
        periodEarnings: periodEarnings.toFixed(2),
        periodCommission: periodCommission.toFixed(2),
        periodOrdersCount,
        avgOrderValue: avgOrderValue.toFixed(2),
        conversionRate: conversionRate.toFixed(2),
        balanceAvailable: parseFloat(vendor.balanceAvailable || 0).toFixed(2),
        balancePending: parseFloat(vendor.balancePending || 0).toFixed(2),
        lifetimeEarnings: parseFloat(vendor.lifetimeVendorEarnings || 0).toFixed(2),
        totalBooks,
        pendingOrders,
      },
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch summary',
      error: error.message,
    });
  }
};

/**
 * Get chart data for revenue over time
 * GET /api/vendor/reports/charts
 */
export const getChartData = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { period = '30', groupBy = 'day' } = req.query;

    const vendor = await Vendor.findOne({ where: { userId } });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    const periodDate = new Date();
    periodDate.setDate(periodDate.getDate() - parseInt(period));

    // Get earnings over time
    const earnings = await VendorEarning.findAll({
      where: {
        vendorId: vendor.id,
        createdAt: { [Op.gte]: periodDate },
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
        [sequelize.fn('SUM', sequelize.col('net_amount')), 'totalEarnings'],
        [sequelize.fn('SUM', sequelize.col('platform_fee')), 'totalCommission'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'orderCount'],
      ],
      group: [sequelize.fn('DATE', sequelize.col('created_at'))],
      order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']],
      raw: true,
    });

    return res.json({
      success: true,
      data: {
        period: parseInt(period),
        groupBy,
        chart: earnings.map((e) => ({
          date: e.date,
          earnings: parseFloat(e.totalEarnings).toFixed(2),
          commission: parseFloat(e.totalCommission).toFixed(2),
          orders: parseInt(e.orderCount),
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching chart data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch chart data',
      error: error.message,
    });
  }
};

/**
 * Get product performance metrics
 * GET /api/vendor/reports/products
 */
export const getProductPerformance = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { page = 1, limit = 20, sortBy = 'sales', sortOrder = 'DESC' } = req.query;

    const vendor = await Vendor.findOne({ where: { userId } });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    // Get products with sales data
    const products = await Book.findAll({
      where: { vendorId: vendor.id },
      attributes: [
        'id',
        'title',
        'author',
        'price',
        'quantity',
        [
          sequelize.literal(`(
            SELECT COUNT(*)::int
            FROM order_items oi
            INNER JOIN orders o ON oi.order_id = o.id
            WHERE oi.book_id = "Book".id
            AND o.status IN ('paid', 'processing', 'shipped', 'delivered')
          )`),
          'salesCount',
        ],
        [
          sequelize.literal(`(
            SELECT COALESCE(SUM(oi.price * oi.quantity), 0)
            FROM order_items oi
            INNER JOIN orders o ON oi.order_id = o.id
            WHERE oi.book_id = "Book".id
            AND o.status IN ('paid', 'processing', 'shipped', 'delivered')
          )`),
          'totalRevenue',
        ],
      ],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order:
        sortBy === 'sales'
          ? [[sequelize.literal('"salesCount"'), sortOrder]]
          : [[sortBy, sortOrder]],
      subQuery: false,
    });

    const total = await Book.count({ where: { vendorId: vendor.id } });

    return res.json({
      success: true,
      data: products.map((p) => ({
        ...p.toJSON(),
        salesCount: p.getDataValue('salesCount') || 0,
        totalRevenue: parseFloat(p.getDataValue('totalRevenue') || 0).toFixed(2),
      })),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching product performance:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch product performance',
      error: error.message,
    });
  }
};

/**
 * Get revenue breakdown by category, condition, etc.
 * GET /api/vendor/reports/revenue
 */
export const getRevenueBreakdown = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { period = '30' } = req.query;

    const vendor = await Vendor.findOne({ where: { userId } });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    const periodDate = new Date();
    periodDate.setDate(periodDate.getDate() - parseInt(period));

    // Revenue by category
    const byCategory = await OrderItem.findAll({
      attributes: [
        [sequelize.col('book.category'), 'category'],
        [
          sequelize.fn('SUM', sequelize.literal('"OrderItem"."price" * "OrderItem"."quantity"')),
          'revenue',
        ],
        [sequelize.fn('COUNT', sequelize.col('OrderItem.id')), 'count'],
      ],
      include: [
        {
          model: Book,
          as: 'book',
          where: { vendorId: vendor.id },
          attributes: [],
        },
        {
          model: Order,
          as: 'order',
          where: {
            createdAt: { [Op.gte]: periodDate },
            status: { [Op.in]: ['paid', 'processing', 'shipped', 'delivered'] },
          },
          attributes: [],
        },
      ],
      group: [sequelize.col('book.category')],
      subQuery: false,
      raw: true,
    });

    // Revenue by condition
    const byCondition = await OrderItem.findAll({
      attributes: [
        [sequelize.col('book.condition'), 'condition'],
        [
          sequelize.fn('SUM', sequelize.literal('"OrderItem"."price" * "OrderItem"."quantity"')),
          'revenue',
        ],
        [sequelize.fn('COUNT', sequelize.col('OrderItem.id')), 'count'],
      ],
      include: [
        {
          model: Book,
          as: 'book',
          where: { vendorId: vendor.id },
          attributes: [],
        },
        {
          model: Order,
          as: 'order',
          where: {
            createdAt: { [Op.gte]: periodDate },
            status: { [Op.in]: ['paid', 'processing', 'shipped', 'delivered'] },
          },
          attributes: [],
        },
      ],
      group: [sequelize.col('book.condition')],
      subQuery: false,
      raw: true,
    });

    return res.json({
      success: true,
      data: {
        period: parseInt(period),
        byCategory: byCategory.map((c) => ({
          category: c.category || 'Uncategorized',
          revenue: parseFloat(c.revenue).toFixed(2),
          count: parseInt(c.count),
        })),
        byCondition: byCondition.map((c) => ({
          condition: c.condition,
          revenue: parseFloat(c.revenue).toFixed(2),
          count: parseInt(c.count),
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching revenue breakdown:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue breakdown',
      error: error.message,
    });
  }
};

/**
 * Get aggregated vendor reports data (summary + top products)
 * GET /api/vendor/reports/overview
 * Combines data that was previously fetched with separate calls
 */
export const getReportsOverview = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { period = '30' } = req.query;

    const vendor = await Vendor.findOne({ where: { userId } });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    const periodDate = new Date();
    periodDate.setDate(periodDate.getDate() - parseInt(period));

    // Run both summary data and top products in parallel
    const [summaryData, topProducts] = await Promise.all([
      // Summary calculation (similar to getSummary)
      (async () => {
        const periodOrders = await Order.findAll({
          include: [
            {
              model: OrderItem,
              as: 'items',
              required: true,
              include: [
                {
                  model: Book,
                  as: 'book',
                  where: { vendorId: vendor.id },
                  required: true,
                },
              ],
            },
          ],
          where: {
            createdAt: { [Op.gte]: periodDate },
            status: { [Op.in]: ['paid', 'processing', 'shipped', 'delivered'] },
          },
        });

        const periodOrdersCount = periodOrders.length;
        const periodRevenue = periodOrders.reduce((sum, order) => {
          return (
            sum +
            order.items.reduce((itemSum, item) => {
              return itemSum + parseFloat(item.price || 0) * (item.quantity || 1);
            }, 0)
          );
        }, 0);

        const periodCommission = periodRevenue * (vendor.commissionRate || 0.08);
        const periodEarnings = periodRevenue - periodCommission;

        const totalBooks = await Book.count({ where: { vendorId: vendor.id } });

        const pendingOrders = await Order.count({
          include: [
            {
              model: OrderItem,
              as: 'items',
              required: true,
              include: [
                {
                  model: Book,
                  as: 'book',
                  where: { vendorId: vendor.id },
                  required: true,
                },
              ],
            },
          ],
          where: {
            status: { [Op.in]: ['pending', 'processing'] },
          },
        });

        const avgOrderValue = periodOrdersCount > 0 ? periodRevenue / periodOrdersCount : 0;

        return {
          period: parseInt(period),
          periodRevenue: periodRevenue.toFixed(2),
          periodEarnings: periodEarnings.toFixed(2),
          periodCommission: periodCommission.toFixed(2),
          periodOrdersCount,
          avgOrderValue: avgOrderValue.toFixed(2),
          conversionRate: '0.00',
          balanceAvailable: parseFloat(vendor.balanceAvailable || 0).toFixed(2),
          balancePending: parseFloat(vendor.balancePending || 0).toFixed(2),
          lifetimeEarnings: parseFloat(vendor.lifetimeVendorEarnings || 0).toFixed(2),
          totalBooks,
          pendingOrders,
        };
      })(),

      // Top products calculation (similar to getProductPerformance but limited)
      (async () => {
        const products = await Book.findAll({
          where: { vendorId: vendor.id },
          attributes: [
            'id',
            'title',
            'author',
            'price',
            'quantity',
            [
              sequelize.literal(`(
                SELECT COUNT(*)::int
                FROM order_items oi
                INNER JOIN orders o ON oi.order_id = o.id
                WHERE oi.book_id = "Book".id
                AND o.status IN ('paid', 'processing', 'shipped', 'delivered')
              )`),
              'salesCount',
            ],
            [
              sequelize.literal(`(
                SELECT COALESCE(SUM(oi.price * oi.quantity), 0)
                FROM order_items oi
                INNER JOIN orders o ON oi.order_id = o.id
                WHERE oi.book_id = "Book".id
                AND o.status IN ('paid', 'processing', 'shipped', 'delivered')
              )`),
              'totalRevenue',
            ],
          ],
          limit: 10, // Top 10 products
          order: [[sequelize.literal('"salesCount"'), 'DESC']],
          subQuery: false,
        });

        return products.map((p) => ({
          ...p.toJSON(),
          salesCount: p.getDataValue('salesCount') || 0,
          totalRevenue: parseFloat(p.getDataValue('totalRevenue') || 0).toFixed(2),
        }));
      })(),
    ]);

    return res.json({
      success: true,
      data: {
        summary: summaryData,
        topProducts,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching reports overview:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch reports overview',
      error: error.message,
    });
  }
};
