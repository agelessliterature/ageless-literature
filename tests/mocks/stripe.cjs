/**
 * Mock for Stripe Service
 * Prevents real Stripe API calls during tests
 */

const mockConstructEvent = jest.fn((payload) => {
  // Parse webhook payload
  const event = typeof payload === 'string' ? JSON.parse(payload) : payload;
  return event;
});

const mockCreateCustomer = jest.fn().mockResolvedValue({
  id: 'cus_mock123',
  email: 'test@example.com',
  created: Date.now()
});

const mockCreatePaymentIntent = jest.fn().mockResolvedValue({
  id: 'pi_mock123',
  client_secret: 'mock_client_secret',
  status: 'requires_payment_method'
});

const mockCreateAccount = jest.fn().mockResolvedValue({
  id: 'acct_mock123',
  type: 'express',
  created: Date.now()
});

const stripeMock = jest.fn().mockImplementation(() => ({
  webhooks: {
    constructEvent: mockConstructEvent
  },
  customers: {
    create: mockCreateCustomer
  },
  paymentIntents: {
    create: mockCreatePaymentIntent
  },
  accounts: {
    create: mockCreateAccount
  }
}));

jest.mock('stripe', () => stripeMock);

// Export for test assertions
const stripeMockService = {
  webhooks: { constructEvent: mockConstructEvent },
  customers: { create: mockCreateCustomer },
  paymentIntents: { create: mockCreatePaymentIntent },
  accounts: { create: mockCreateAccount },
  reset: () => {
    mockConstructEvent.mockClear();
    mockCreateCustomer.mockClear();
    mockCreatePaymentIntent.mockClear();
    mockCreateAccount.mockClear();
    stripeMock.mockClear();
  }
};

module.exports = { stripeMockService };
