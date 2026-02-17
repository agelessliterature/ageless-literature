/**
 * Vendor Orders Controller
 * Handles vendor-specific order management and fulfillment
 */

import db from '../models/index.js';
import { Op } from 'sequelize';

const { Order, OrderItem, Book, User, Vendor } = db;

/**
 * Get all orders containing vendor's products
 * GET /api/vendor/orders
 */
export const getVendorOrders = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { page = 1, limit = 20, status, startDate, endDate, search } = req.query;

    const vendor = await Vendor.findOne({ where: { userId } });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    // Build where clause for orders
    const orderWhere = {};

    if (status) orderWhere.status = status;
    if (search) orderWhere.orderNumber = { [Op.iLike]: `%${search}%` };
    if (startDate || endDate) {
      orderWhere.createdAt = {};
      if (startDate) orderWhere.createdAt[Op.gte] = new Date(startDate);
      if (endDate) orderWhere.createdAt[Op.lte] = new Date(endDate);
    }

    // Get orders containing vendor's products
    const { count, rows: orders } = await Order.findAndCountAll({
      where: orderWhere,
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
              attributes: ['id', 'title', 'author', 'price'],
            },
          ],
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      subQuery: false,
      distinct: true,
    });

    // Calculate vendor-specific totals for each order
    const enrichedOrders = orders.map((order) => {
      const vendorItems = order.items.filter((item) => item.book?.vendorId === vendor.id);
      const vendorTotal = vendorItems.reduce(
        (sum, item) => sum + parseFloat(item.price) * item.quantity,
        0,
      );
      const vendorEarnings = vendorTotal * 0.92; // 92% to vendor, 8% commission

      return {
        ...order.toJSON(),
        vendorItemsCount: vendorItems.length,
        vendorTotal,
        vendorEarnings,
      };
    });

    return res.json({
      success: true,
      data: enrichedOrders,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching vendor orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message,
    });
  }
};

/**
 * Get single order detail
 * GET /api/vendor/orders/:id
 */
export const getVendorOrderDetail = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { id } = req.params;

    const vendor = await Vendor.findOne({ where: { userId } });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    const order = await Order.findByPk(id, {
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: Book,
              as: 'book',
              include: [
                {
                  model: Vendor,
                  as: 'vendor',
                  attributes: ['id', 'shopName'],
                },
              ],
            },
          ],
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Verify vendor has items in this order
    const hasVendorItems = order.items.some((item) => item.book?.vendorId === vendor.id);

    if (!hasVendorItems) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this order',
      });
    }

    // Filter to show only vendor's items
    const vendorItems = order.items.filter((item) => item.book?.vendorId === vendor.id);

    return res.json({
      success: true,
      data: {
        ...order.toJSON(),
        items: vendorItems,
      },
    });
  } catch (error) {
    console.error('Error fetching order detail:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch order detail',
      error: error.message,
    });
  }
};

/**
 * Update order status (for vendor items)
 * PUT /api/vendor/orders/:id/status
 */
export const updateOrderStatus = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { id } = req.params;
    const { status, itemIds } = req.body;

    if (!['processing', 'shipped', 'delivered'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value',
      });
    }

    const vendor = await Vendor.findOne({ where: { userId } });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    const order = await Order.findByPk(id, {
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [{ model: Book, as: 'book' }],
        },
      ],
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Update status for vendor's items
    const vendorItemIds = order.items
      .filter((item) => item.book?.vendorId === vendor.id)
      .map((item) => item.id);

    if (itemIds && itemIds.length > 0) {
      // Update specific items
      await OrderItem.update(
        { status },
        {
          where: {
            id: { [Op.in]: itemIds },
            orderId: id,
          },
        },
      );
    } else {
      // Update all vendor items
      await OrderItem.update(
        { status },
        {
          where: {
            id: { [Op.in]: vendorItemIds },
            orderId: id,
          },
        },
      );
    }

    // Check if all items are now the same status to update order status
    const updatedOrder = await Order.findByPk(id, {
      include: [{ model: OrderItem, as: 'items' }],
    });

    const allStatuses = updatedOrder.items.map((item) => item.status);
    const uniqueStatuses = [...new Set(allStatuses)];

    if (uniqueStatuses.length === 1) {
      await updatedOrder.update({ status: uniqueStatuses[0] });
    }

    return res.json({
      success: true,
      message: 'Order status updated successfully',
      data: updatedOrder,
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message,
    });
  }
};

/**
 * Update tracking information
 * PUT /api/vendor/orders/:id/tracking
 */
export const updateTrackingInfo = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { id } = req.params;
    const { trackingNumber, carrier, itemIds } = req.body;

    if (!trackingNumber) {
      return res.status(400).json({
        success: false,
        message: 'Tracking number is required',
      });
    }

    const vendor = await Vendor.findOne({ where: { userId } });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    const order = await Order.findByPk(id, {
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [{ model: Book, as: 'book' }],
        },
      ],
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Update tracking for vendor's items
    const vendorItemIds = order.items
      .filter((item) => item.book?.vendorId === vendor.id)
      .map((item) => item.id);

    const updateData = {
      trackingNumber,
      ...(carrier && { carrier }),
      status: 'shipped',
      shippedAt: new Date(),
    };

    if (itemIds && itemIds.length > 0) {
      await OrderItem.update(updateData, {
        where: {
          id: { [Op.in]: itemIds },
          orderId: id,
        },
      });
    } else {
      await OrderItem.update(updateData, {
        where: {
          id: { [Op.in]: vendorItemIds },
          orderId: id,
        },
      });
    }

    // Update order tracking and status
    await order.update({
      trackingNumber,
      carrier,
      status: 'shipped',
    });

    return res.json({
      success: true,
      message: 'Tracking information updated successfully',
      data: order,
    });
  } catch (error) {
    console.error('Error updating tracking info:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update tracking information',
      error: error.message,
    });
  }
};

/**
 * Request refund for order
 * POST /api/vendor/orders/:id/refund-request
 */
export const requestRefund = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Refund reason is required',
      });
    }

    const vendor = await Vendor.findOne({ where: { userId } });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    const order = await Order.findByPk(id, {
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [{ model: Book, as: 'book' }],
        },
      ],
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Verify vendor owns the items
    const hasVendorItems = order.items.some((item) => item.book?.vendorId === vendor.id);

    if (!hasVendorItems) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Create refund request (this would integrate with payment processor)
    // For now, just update order status
    await order.update({
      status: 'refund_requested',
      refundReason: reason,
      refundRequestedAt: new Date(),
      refundRequestedBy: 'vendor',
    });

    return res.json({
      success: true,
      message: 'Refund request submitted successfully',
      data: order,
    });
  } catch (error) {
    console.error('Error requesting refund:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to request refund',
      error: error.message,
    });
  }
};
