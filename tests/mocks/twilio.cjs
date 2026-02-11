/**
 * Mock for Twilio SMS Service
 * Prevents real SMS sending during tests
 */

const mockCreate = jest.fn().mockResolvedValue({
  sid: 'MOCK_MESSAGE_SID',
  status: 'sent',
  to: '+15555555555',
  from: '+15555555555',
  body: 'Mock SMS message'
});

const twilioMock = jest.fn().mockImplementation(() => ({
  messages: {
    create: mockCreate
  }
}));

jest.mock('twilio', () => twilioMock);

// Export for test assertions
const twilioServiceMock = {
  messages: {
    create: mockCreate
  },
  reset: () => {
    mockCreate.mockClear();
    twilioMock.mockClear();
  }
};

module.exports = { twilioServiceMock };
