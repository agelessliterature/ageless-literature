/**
 * Notifications Controller
 * In-app notifications with pagination, read status, and bulk operations
 */

import db from '../models/index.js';

const { Notification } = db;

/**
 * Get user's notifications with pagination and filtering
 * GET /api/notifications
 * Query params: page, limit, type, isRead
 */
export const getNotifications = async (req, res) => {
  try {
    const { userId } = req.user;
    const { page = 1, limit = 20, type = null, isRead = null } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    const where = { userId };
    if (type) where.type = type;
    if (isRead !== null) where.isRead = isRead === 'true';

    const { count, rows: notifications } = await Notification.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get count of unread notifications
 * GET /api/notifications/unread-count
 */
export const getUnreadCount = async (req, res) => {
  try {
    const { userId } = req.user;

    const count = await Notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Mark notification as read
 * PATCH /api/notifications/:id/read
 */
export const markAsRead = async (req, res) => {
  try {
    const { userId } = req.user;
    const { id } = req.params;

    const notification = await Notification.findOne({
      where: { id, userId },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    // Only update if not already read
    if (!notification.isRead) {
      notification.isRead = true;
      await notification.save();

      // Emit real-time notification via Socket.IO
      try {
        const { getIO } = await import('../sockets/index.js');
        const io = getIO();
        io.to(`user:${userId}`).emit('notification:read', { id: notification.id });
      } catch (socketError) {
        if (process.env.NODE_ENV !== 'test')
          console.error('Failed to emit notification socket event:', socketError.message);
      }
    }

    res.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Mark all notifications as read
 * PATCH /api/notifications/mark-all-read
 */
export const markAllAsRead = async (req, res) => {
  try {
    const { userId } = req.user;

    const readAt = new Date();
    const [updatedCount] = await Notification.update(
      {
        isRead: true,
        readAt,
      },
      {
        where: {
          userId,
          isRead: false,
        },
      },
    );

    // Emit real-time notification via Socket.IO
    if (updatedCount > 0) {
      try {
        const { getIO } = await import('../sockets/index.js');
        const io = getIO();
        io.to(`user:${userId}`).emit('notification:read_all', { readAt: readAt.toISOString() });
      } catch (socketError) {
        if (process.env.NODE_ENV !== 'test')
          console.error('Failed to emit notification socket event:', socketError.message);
      }
    }

    res.json({
      success: true,
      data: { updated: updatedCount },
      message: `Marked ${updatedCount} notification(s) as read`,
    });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete a notification
 * DELETE /api/notifications/:id
 */
export const deleteNotification = async (req, res) => {
  try {
    const { userId } = req.user;
    const { id } = req.params;

    const notification = await Notification.findOne({
      where: { id, userId },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    await notification.destroy();

    res.json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete all notifications for user
 * DELETE /api/notifications/all
 */
export const deleteAllNotifications = async (req, res) => {
  try {
    const { userId } = req.user;

    const deletedCount = await Notification.destroy({
      where: { userId },
    });

    res.json({
      success: true,
      data: { deleted: deletedCount },
      message: `Deleted ${deletedCount} notification(s)`,
    });
  } catch (error) {
    console.error('Error deleting all notifications:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
