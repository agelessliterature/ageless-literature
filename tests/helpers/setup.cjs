/**
 * Jest Setup File
 * Runs before all tests to configure environment and load mocks
 */

const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env (dev environment)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Set test environment
process.env.NODE_ENV = 'test';

// Import mocks (automatically applied via jest.mock())
require('../mocks/sendgrid.cjs');
require('../mocks/twilio.cjs');
require('../mocks/stripe.cjs');

// Increase timeout for database operations
jest.setTimeout(10000);

// Suppress console output during tests (optional)
if (process.env.SUPPRESS_TEST_LOGS === 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  };
}

// Global test utilities
global.testUtils = {
  generateMockToken: (userId) => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { userId, email: 'test@example.com' },
      process.env.JWT_SECRET || 'test-jwt-secret',
      { expiresIn: '1h' }
    );
  },
  
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  mockDate: (dateString) => {
    const mockDate = new Date(dateString);
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
  }
};

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});
