/**
 * Admin Dashboard Controller
 * Aggregates dashboard data into a single endpoint to improve performance
 */

import db from '../../models/index.js';
import { Op } from 'sequelize';

const { User, Vendor, Order, VendorPayout, Auction, OrderItem } = db;

/**
 * Get admin dashboard data (aggregated)
 * GET /api/admin/dashboard
 */
export const getAdminDashboard = async (req, res) => {
  try {
    // Run all queries in parallel for better performance
    const [
      userStats,
      vendorStats,
      payoutStats,
      recentOrders,
      pendingVendors,
      pendingOrders,
      auctionStats,
    ] = await Promise.all([
      // User stats
      User.findAll({
        attributes: [
          [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'total'],
          [
            db.sequelize.fn(
              'COUNT',
              db.sequelize.literal("CASE WHEN status = 'active' THEN 1 END"),
            ),
            'active',
          ],
          [
            db.sequelize.fn('COUNT', db.sequelize.literal("CASE WHEN role = 'admin' THEN 1 END")),
            'admins',
          ],
          [
            db.sequelize.fn('COUNT', db.sequelize.literal("CASE WHEN role = 'vendor' THEN 1 END")),
            'vendors',
          ],
        ],
        raw: true,
      }),

      // Vendor stats
      Vendor.findAll({
        attributes: [
          [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'total'],
          [
            db.sequelize.fn(
              'COUNT',
              db.sequelize.literal("CASE WHEN status = 'approved' THEN 1 END"),
            ),
            'approved',
          ],
          [
            db.sequelize.fn(
              'COUNT',
              db.sequelize.literal("CASE WHEN status = 'pending' THEN 1 END"),
            ),
            'pending',
          ],
          [
            db.sequelize.fn(
              'COUNT',
              db.sequelize.literal("CASE WHEN status = 'suspended' THEN 1 END"),
            ),
            'suspended',
          ],
        ],
        raw: true,
      }),

      // Payout stats
      VendorPayout.findAll({
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
      }),

      // Recent orders (last 5)
      Order.findAll({
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email'],
          },
          {
            model: OrderItem,
            as: 'items',
            attributes: ['id', 'title', 'quantity', 'price'],
            limit: 3, // Show first 3 items
          },
        ],
        order: [['createdAt', 'DESC']],
        limit: 5,
      }),

      // Pending vendors count and data
      Vendor.findAll({
        where: { status: 'pending' },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email'],
          },
        ],
        order: [['createdAt', 'DESC']],
        limit: 10, // Show up to 10 recent pending vendors
      }),

      // Pending orders count and data
      Order.findAll({
        where: { status: { [Op.in]: ['pending', 'processing'] } },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email'],
          },
        ],
        order: [['createdAt', 'DESC']],
        limit: 10, // Show up to 10 recent pending orders
      }),

      // Auction stats (if Auction model exists)
      Auction
        ? Auction.findAll({
            attributes: [
              [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'total'],
              [
                db.sequelize.fn(
                  'COUNT',
                  db.sequelize.literal("CASE WHEN status = 'active' THEN 1 END"),
                ),
                'active',
              ],
              [
                db.sequelize.fn(
                  'COUNT',
                  db.sequelize.literal("CASE WHEN status = 'ended_sold' THEN 1 END"),
                ),
                'sold',
              ],
            ],
            raw: true,
          })
        : Promise.resolve([{ total: 0, active: 0, sold: 0 }]),
    ]);

    // Format the aggregated response
    const dashboardData = {
      stats: {
        totalUsers: userStats[0]?.total || 0,
        activeUsers: userStats[0]?.active || 0,
        totalVendors: vendorStats[0]?.total || 0,
        activeVendors: vendorStats[0]?.approved || 0,
        totalSales: payoutStats[0]?.totalPaid || 0,
        totalAuctions: auctionStats[0]?.total || 0,
        activeAuctions: auctionStats[0]?.active || 0,
      },
      quickActions: {
        pendingVendors: vendorStats[0]?.pending || 0,
        pendingOrders: pendingOrders.length,
        suspendedVendors: vendorStats[0]?.suspended || 0,
      },
      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customer:
          `${order.user?.firstName || ''} ${order.user?.lastName || ''}`.trim() ||
          order.user?.email ||
          'Unknown Customer',
        customerEmail: order.user?.email,
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt,
        itemCount: order.items?.length || 0,
        items:
          order.items?.slice(0, 2).map((item) => ({
            title: item.title,
            quantity: item.quantity,
            price: item.price,
          })) || [],
      })),
      pendingVendors: pendingVendors.map((vendor) => ({
        id: vendor.id,
        shopName: vendor.shopName,
        shopUrl: vendor.shopUrl,
        ownerName:
          `${vendor.user?.firstName || ''} ${vendor.user?.lastName || ''}`.trim() ||
          vendor.user?.email ||
          'Unknown Owner',
        email: vendor.user?.email,
        createdAt: vendor.createdAt,
        businessDescription: vendor.businessDescription?.substring(0, 100) + '...',
      })),
      pendingOrdersList: pendingOrders.slice(0, 5).map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customer:
          `${order.user?.firstName || ''} ${order.user?.lastName || ''}`.trim() ||
          order.user?.email ||
          'Unknown Customer',
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt,
      })),
      summary: {
        totalPayouts: payoutStats[0]?.totalPayouts || 0,
        totalPayoutAmount: payoutStats[0]?.totalAmount || 0,
        pendingPayoutAmount: payoutStats[0]?.totalPending || 0,
        userGrowthRate: '5.2%', // Could be calculated from historical data
        vendorApprovalRate: Math.round(
          ((vendorStats[0]?.approved || 0) / Math.max(vendorStats[0]?.total || 1, 1)) * 100,
        ),
        auctionSuccessRate: Math.round(
          ((auctionStats[0]?.sold || 0) / Math.max(auctionStats[0]?.total || 1, 1)) * 100,
        ),
      },
    };

    return res.json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error('Error fetching admin dashboard data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message,
    });
  }
};
