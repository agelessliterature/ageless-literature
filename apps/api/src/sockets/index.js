import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import chatHandler from './chatHandler.js';

let io;

const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: config.cors,
    transports: ['websocket', 'polling'],
  });

  // Redis adapter is optional - only use if Redis is available
  // For local development without Redis, Socket.IO works in single-server mode
  if (process.env.REDIS_URL || process.env.NODE_ENV === 'production') {
    try {
      const pubClient = new Redis(config.redis.url, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: false,
        lazyConnect: true,
      });
      const subClient = pubClient.duplicate();

      pubClient.on('error', (err) => {
        console.warn('Redis Pub Client Error (Socket.IO will work without Redis):', err.message);
      });

      subClient.on('error', (err) => {
        console.warn('Redis Sub Client Error (Socket.IO will work without Redis):', err.message);
      });

      // Try to connect to Redis
      Promise.all([pubClient.connect(), subClient.connect()])
        .then(() => {
          io.adapter(createAdapter(pubClient, subClient));
          console.log('Socket.IO Redis adapter enabled');
        })
        .catch((err) => {
          console.warn(
            'Could not connect to Redis, running Socket.IO in single-server mode:',
            err.message,
          );
        });
    } catch (error) {
      console.warn(
        'Redis adapter initialization failed, running Socket.IO in single-server mode:',
        error.message,
      );
    }
  } else {
    console.log('Socket.IO running in single-server mode (no Redis)');
  }

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      // Allow connection but don't set userId - user can still use public features
      return next();
    }

    try {
      const jwtSecret =
        config.jwt?.secret ||
        process.env.JWT_SECRET ||
        'your-super-secret-jwt-key-change-in-production';
      const decoded = jwt.verify(token, jwtSecret);
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      // Invalid token - allow connection but no userId
      next();
    }
  });

  // Initialize chat namespace handler
  chatHandler(io);

  io.on('connection', (socket) => {
    // Join user-specific room for notification broadcasts
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
      console.log(`User ${socket.userId} connected and joined user room`);
    }

    socket.on('new_message', async (data) => {
      const { receiverId, content } = data;
      io.to(`user:${receiverId}`).emit('new_message', {
        senderId: socket.userId,
        content,
        timestamp: new Date(),
      });
    });

    socket.on('disconnect', () => {
      if (socket.userId) {
        console.log(`User ${socket.userId} disconnected`);
      }
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
};

/**
 * Emit notification event to user
 * Maps notification data to UI-ready payload
 */
const emitNotification = (userId, eventType, notification) => {
  if (!io || !userId) return;

  try {
    // Map notification type to UI data (matches frontend mapNotificationToUI)
    const { type, data, id, isRead, readAt, createdAt } = notification;
    let title, message, href, icon, color;

    switch (type) {
      case 'AUCTION_WON_PAYMENT_DUE':
      case 'SMS_AUCTION_WON_PAYMENT_DUE':
        title = 'You Won an Auction!';
        message = data?.metadata?.productTitle
          ? `Congratulations! You won "${data.metadata.productTitle}". Payment is due.`
          : 'Congratulations! You won an auction. Payment is due.';
        icon = 'trophy';
        color = 'text-yellow-600';
        href = '/account/winnings';
        break;

      case 'ORDER_CONFIRMED_BUYER':
        title = 'Order Confirmed';
        message = data?.metadata?.orderNumber
          ? `Your order #${data.metadata.orderNumber} has been confirmed.`
          : 'Your order has been confirmed.';
        icon = 'check-circle';
        color = 'text-green-600';
        href = data?.entityId ? `/account/orders?highlight=${data.entityId}` : '/account/orders';
        break;

      case 'ORDER_NEW_VENDOR':
        title = 'New Order Received';
        message = data?.metadata?.orderNumber
          ? `New order #${data.metadata.orderNumber} received.`
          : 'You have a new order.';
        icon = 'box';
        color = 'text-blue-600';
        href = data?.entityId ? `/vendor/orders?highlight=${data.entityId}` : '/vendor/orders';
        break;

      case 'PAYMENT_FAILED':
      case 'SMS_PAYMENT_FAILED':
        title = 'Payment Failed';
        message = data?.metadata?.reason
          ? `Payment failed: ${data.metadata.reason}`
          : 'A payment attempt has failed. Please update your payment method.';
        icon = 'exclamation-triangle';
        color = 'text-red-600';
        href = '/account/settings';
        break;

      default:
        title = 'Notification';
        message = 'You have a new notification.';
        icon = 'bell';
        color = 'text-gray-600';
        href = '/account/notifications';
    }

    const payload = {
      id,
      type,
      isRead,
      readAt,
      createdAt,
      title,
      message,
      href,
      icon,
      color,
    };

    io.to(`user:${userId}`).emit(eventType, payload);
    console.log(`NOTIFICATION: ${eventType} | user=${userId} | type=${type}`);
  } catch (error) {
    console.error('ERROR: Error emitting notification:', error);
  }
};

export { initializeSocket, getIO, emitNotification };
