module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/tests/unit/**/*.test.js',
    '**/tests/integration/**/*.test.js'
  ],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'apps/api/src/**/*.js',
    '!apps/api/src/**/*.test.js',
    '!apps/api/src/migrations/**',
    '!apps/api/src/seeders/**'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/setup.cjs'],
  globalSetup: '<rootDir>/tests/helpers/global-setup.cjs',
  globalTeardown: '<rootDir>/tests/helpers/global-teardown.cjs',
  testTimeout: 10000,
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  maxWorkers: 1,  // Run tests sequentially to avoid DB conflicts
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/apps/api/src/$1'
  },
  moduleFileExtensions: ['js', 'json', 'node'],
  transform: {}
};
