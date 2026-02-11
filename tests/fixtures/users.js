/**
 * Test User Fixtures
 * Pre-defined test users for consistent testing
 */

export const testUsers = {
  buyer: {
    email: 'buyer@test.com',
    password: 'Test123!@#',
    firstName: 'Test',
    lastName: 'Buyer',
    role: 'customer',
    defaultLanguage: 'en',
  },

  vendor: {
    email: 'vendor@test.com',
    password: 'Test123!@#',
    firstName: 'Test',
    lastName: 'Vendor',
    role: 'vendor',
    defaultLanguage: 'en',
    vendor: {
      shopName: 'Test Rare Books',
      shopUrl: 'test-rare-books',
      description: 'A test vendor shop',
      status: 'active',
    },
  },

  admin: {
    email: 'admin@test.com',
    password: 'Test123!@#',
    firstName: 'Test',
    lastName: 'Admin',
    role: 'admin',
    defaultLanguage: 'en',
  },

  buyerWithPhone: {
    email: 'buyer-phone@test.com',
    password: 'Test123!@#',
    firstName: 'Phone',
    lastName: 'Buyer',
    role: 'customer',
    phoneNumber: '+15555551234',
    metadata: {
      phoneVerified: true,
      smsOptIn: true,
      smsStop: false,
    },
  },
};

/**
 * Hashed version of Test123!@# password for seeding
 * Use bcrypt.hashSync('Test123!@#', 10) to generate
 */
export const TEST_PASSWORD_HASH = '$2b$10$XqGn8L0ZvGZQGqKp7rXYYOK8Y3fZHj9Qx7vZQGqKp7rXYYOK8Y3fZ';
