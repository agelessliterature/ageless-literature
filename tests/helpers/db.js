/**
 * Test Database Helper
 * Provides database access for tests - seeding is handled by global-setup.cjs
 */

import db from '../../apps/api/src/models/index.js';
import { testUsers } from '../fixtures/users.js';

const { User, Vendor, Book, Product, Category, Notification, sequelize } = db;

// Export models for test use
export { User, Vendor, Book, Product, Category, Notification, sequelize };

/**
 * Get test user by role (buyer, vendor, admin)
 */
export async function getTestUser(role = 'buyer') {
  const userData = testUsers[role];
  if (!userData) {
    throw new Error(`Unknown test user role: ${role}`);
  }

  const user = await User.findOne({ where: { email: userData.email } });
  if (!user) {
    throw new Error(`Test user ${role} not found. Did global-setup run?`);
  }

  return user;
}

/**
 * Get test vendor (with user)
 */
export async function getTestVendor() {
  const user = await getTestUser('vendor');
  const vendor = await Vendor.findOne({ where: { userId: user.id } });
  return { user, vendor };
}

/**
 * Initialize database connection for tests
 */
export async function initTestDb() {
  try {
    await sequelize.authenticate();
    console.log('[TEST DB] Connected successfully');
  } catch (error) {
    console.error('[TEST DB] Connection failed:', error);
    throw error;
  }
}

/**
 * Close database connection
 */
export async function closeTestDb() {
  try {
    await sequelize.close();
    console.log('[TEST DB] Connection closed');
  } catch (error) {
    // Ignore errors on close
  }
}

/**
 * Create a notification for testing
 */
export async function createTestNotification(userId, data = {}) {
  return Notification.create({
    userId,
    type: data.type || 'ORDER_UPDATE',
    title: data.title || 'Test Notification',
    message: data.message || 'This is a test notification',
    isRead: data.isRead || false,
    data: data.data || {},
    ...data,
  });
}

/**
 * Clean notifications for a specific user (for test isolation)
 */
export async function cleanUserNotifications(userId) {
  await Notification.destroy({ where: { userId } });
}

// Simplified setup - just connect, data is already seeded
export async function setupTestDb() {
  await initTestDb();
}

// Simplified teardown - just close connection
export async function teardownTestDb() {
  await closeTestDb();
}
