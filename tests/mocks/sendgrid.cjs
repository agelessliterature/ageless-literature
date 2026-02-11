/**
 * Mock for SendGrid Email Service
 * Prevents real email sending during tests
 */

const mockSend = jest.fn().mockResolvedValue([{
  statusCode: 202,
  body: '',
  headers: {}
}]);

const mockSetApiKey = jest.fn();

jest.mock('@sendgrid/mail', () => ({
  setApiKey: mockSetApiKey,
  send: mockSend,
  __esModule: true,
  default: {
    setApiKey: mockSetApiKey,
    send: mockSend
  }
}));

// Export for test assertions
const sendGridMock = {
  send: mockSend,
  setApiKey: mockSetApiKey,
  reset: () => {
    mockSend.mockClear();
    mockSetApiKey.mockClear();
  }
};

module.exports = { sendGridMock };
