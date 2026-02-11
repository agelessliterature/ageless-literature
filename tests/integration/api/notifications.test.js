/**
 * Notifications API Integration Tests
 * P0 - Critical for deployment
 */

import request from 'supertest';
import { createServer } from 'http';
import app from '../../../apps/api/src/server.js';
import { setupTestDb, teardownTestDb } from '../../helpers/db.js';
import { testUsers } from '../../fixtures/users.js';
import db from '../../../apps/api/src/models/index.js';
import { initializeSocket } from '../../../apps/api/src/sockets/index.js';

const { Notification } = db;

describe('Notifications API', () => {
  let buyerToken;
  let buyerUserId;
  let httpServer;
  let io;

  beforeAll(async () => {
    await setupTestDb();

    // Initialize Socket.IO for notification emissions
    httpServer = createServer(app);
    io = initializeSocket(httpServer);
    await new Promise((resolve) => {
      httpServer.listen(0, resolve); // Random available port
    });

    // Login as buyer
    const loginResponse = await request(app).post('/api/auth/login').send({
      email: testUsers.buyer.email,
      password: testUsers.buyer.password,
    });

    buyerToken = loginResponse.body.data.token;
    buyerUserId = loginResponse.body.data.user.id;

    // Create test notifications
    await Notification.create({
      userId: buyerUserId,
      type: 'AUCTION_WON_PAYMENT_DUE',
      title: 'You won an auction!',
      message: 'Payment due within 48 hours',
      data: { auctionId: 1, amount: 150.0 },
    });

    await Notification.create({
      userId: buyerUserId,
      type: 'ORDER_CONFIRMED_BUYER',
      title: 'Order confirmed',
      message: 'Your order has been confirmed',
      data: { orderId: 123 },
      isRead: true,
    });
  });

  afterAll(async () => {
    // Close Socket.IO and HTTP server
    if (io) {
      io.close();
    }
    if (httpServer) {
      await new Promise((resolve) => {
        httpServer.close(resolve);
      });
    }
    await teardownTestDb();
  });

  describe('GET /api/notifications', () => {
    it('should return user notifications', async () => {
      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.notifications).toBeDefined();
      expect(response.body.data.notifications.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter unread notifications', async () => {
      const response = await request(app)
        .get('/api/notifications?isRead=false')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.notifications.length).toBeGreaterThanOrEqual(1);
      // All returned notifications should have isRead: false
      expect(response.body.data.notifications.every((n) => n.isRead === false)).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/notifications');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/notifications/unread-count', () => {
    it('should return unread count', async () => {
      const response = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(typeof response.body.data.count).toBe('number');
      expect(response.body.data.count).toBeGreaterThanOrEqual(1);
    });
  });

  describe('PATCH /api/notifications/:id/read', () => {
    it('should mark notification as read', async () => {
      // Get unread notification
      const listResponse = await request(app)
        .get('/api/notifications?isRead=false')
        .set('Authorization', `Bearer ${buyerToken}`);

      const unreadNotification = listResponse.body.data.notifications[0];

      // Mark as read
      const response = await request(app)
        .patch(`/api/notifications/${unreadNotification.id}/read`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify it's marked as read
      const notification = await Notification.findByPk(unreadNotification.id);
      expect(notification.isRead).toBe(true);
    });

    it("should reject marking another user's notification", async () => {
      // Create notification for vendor
      const vendorLoginResponse = await request(app).post('/api/auth/login').send({
        email: testUsers.vendor.email,
        password: testUsers.vendor.password,
      });

      const vendorNotification = await Notification.create({
        userId: vendorLoginResponse.body.data.user.id,
        type: 'ORDER_NEW_VENDOR',
        title: 'New order',
        message: 'You have a new order',
      });

      // Try to mark vendor's notification as buyer
      const response = await request(app)
        .patch(`/api/notifications/${vendorNotification.id}/read`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(404); // Not found (security)
    });
  });

  describe('PATCH /api/notifications/mark-all-read', () => {
    it('should mark all notifications as read', async () => {
      const response = await request(app)
        .patch('/api/notifications/mark-all-read')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify all are marked as read
      const unreadCount = await Notification.count({
        where: { userId: buyerUserId, isRead: false },
      });
      expect(unreadCount).toBe(0);
    });
  });

  describe('DELETE /api/notifications/:id', () => {
    it('should delete notification', async () => {
      // Create a notification to delete
      const notification = await Notification.create({
        userId: buyerUserId,
        type: 'TEST_NOTIFICATION',
        title: 'Test',
        message: 'To be deleted',
      });

      const response = await request(app)
        .delete(`/api/notifications/${notification.id}`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify it's deleted
      const deletedNotification = await Notification.findByPk(notification.id);
      expect(deletedNotification).toBeNull();
    });
  });
});
