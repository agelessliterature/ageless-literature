/**
 * Socket.IO Integration Tests
 * Tests real-time notification delivery via WebSockets
 * P0 - Critical for real-time features
 */

import { io as ioClient } from 'socket.io-client';
import { createServer } from 'http';
import jwt from 'jsonwebtoken';
import { initializeSocket } from '../../../apps/api/src/sockets/index.js';
import { setupTestDb, teardownTestDb } from '../../helpers/db.js';
import { testUsers } from '../../fixtures/users.js';
import db from '../../../apps/api/src/models/index.js';

const { Notification } = db;

describe('Socket.IO Notifications', () => {
  let httpServer;
  let io;
  let clientSocket;
  let buyerUserId;
  let buyerToken;
  const TEST_PORT = 3002;

  beforeAll(async () => {
    await setupTestDb();

    // Get buyer user and generate token
    const User = db.User;
    const buyer = await User.findOne({ where: { email: testUsers.buyer.email } });
    buyerUserId = buyer.id;

    // Generate JWT token
    buyerToken = jwt.sign(
      { userId: buyerUserId, email: buyer.email },
      process.env.JWT_SECRET || 'test-jwt-secret',
      { expiresIn: '1h' },
    );

    // Create test HTTP server with Socket.IO
    httpServer = createServer();
    io = initializeSocket(httpServer);

    await new Promise((resolve) => {
      httpServer.listen(TEST_PORT, resolve);
    });
  });

  afterAll(async () => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
    if (httpServer) {
      await new Promise((resolve) => {
        httpServer.close(resolve);
      });
    }
    await teardownTestDb();
  });

  beforeEach((done) => {
    // Create client connection
    clientSocket = ioClient(`http://localhost:${TEST_PORT}`, {
      auth: { token: buyerToken },
      transports: ['websocket'],
    });

    clientSocket.on('connect', done);
  });

  afterEach(() => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  it('should connect with valid JWT token', (done) => {
    expect(clientSocket.connected).toBe(true);
    done();
  });

  it('should join user-specific room on connection', (done) => {
    // Verify user is in their room by emitting to the room
    const testMessage = { test: 'data' };

    clientSocket.on('test_event', (data) => {
      expect(data).toEqual(testMessage);
      done();
    });

    // Emit to user's room from server
    setTimeout(() => {
      io.to(`user:${buyerUserId}`).emit('test_event', testMessage);
    }, 100);
  });

  it('should receive notification:new event when notification created', (done) => {
    clientSocket.on('notification:new', (data) => {
      expect(data).toBeDefined();
      expect(data.type).toBe('TEST_NOTIFICATION');
      // emitNotification transforms unknown types to default title/message
      expect(data.title).toBe('Notification');
      expect(data.message).toBe('You have a new notification.');
      done();
    });

    // Simulate notification creation (would normally be done by API)
    setTimeout(async () => {
      const notification = await Notification.create({
        userId: buyerUserId,
        type: 'TEST_NOTIFICATION',
        title: 'Socket Test',
        message: 'Testing socket delivery',
      });

      // Manually emit (in real code, this is done by the API controller)
      const { emitNotification } = await import('../../../apps/api/src/sockets/index.js');
      emitNotification(buyerUserId, 'notification:new', {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
      });
    }, 100);
  }, 10000);

  it('should receive notification:read event when notification marked read', (done) => {
    clientSocket.on('notification:read', (data) => {
      expect(data).toBeDefined();
      expect(data.id).toBeDefined();
      done();
    });

    // Simulate mark as read
    setTimeout(async () => {
      const notification = await Notification.create({
        userId: buyerUserId,
        type: 'TEST_NOTIFICATION',
        title: 'Mark Read Test',
        message: 'Testing mark as read',
      });

      const { emitNotification } = await import('../../../apps/api/src/sockets/index.js');
      emitNotification(buyerUserId, 'notification:read', { id: notification.id });
    }, 100);
  });

  it('should receive notification:read_all event', (done) => {
    clientSocket.on('notification:read_all', (data) => {
      expect(data).toBeDefined();
      expect(data.readAt).toBeDefined();
      done();
    });

    // Simulate mark all as read
    setTimeout(async () => {
      const { emitNotification } = await import('../../../apps/api/src/sockets/index.js');
      emitNotification(buyerUserId, 'notification:read_all', { readAt: new Date() });
    }, 100);
  });

  it('should NOT receive notifications for other users', (done) => {
    let receivedNotification = false;

    clientSocket.on('notification:new', () => {
      receivedNotification = true;
    });

    // Emit to a different user's room
    setTimeout(() => {
      io.to('user:99999').emit('notification:new', {
        type: 'OTHER_USER_NOTIFICATION',
        title: 'Should not receive this',
      });
    }, 100);

    // Wait and verify no notification received
    setTimeout(() => {
      expect(receivedNotification).toBe(false);
      done();
    }, 500);
  });

  it('should allow connection without token (but no user room)', (done) => {
    // Disconnect authenticated client
    clientSocket.disconnect();

    // Create unauthenticated client
    const unauthClient = ioClient(`http://localhost:${TEST_PORT}`, {
      transports: ['websocket'],
    });

    unauthClient.on('connect', () => {
      expect(unauthClient.connected).toBe(true);

      // Should not receive user-specific notifications
      unauthClient.on('notification:new', () => {
        expect(true).toBe(false); // Should not receive notifications
      });

      setTimeout(() => {
        unauthClient.disconnect();
        done();
      }, 500);
    });
  });
});
