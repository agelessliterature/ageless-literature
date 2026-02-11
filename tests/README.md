# Ageless Literature - Testing Guide

This directory contains the complete test suite for the Ageless Literature application.

## Directory Structure

```
tests/
├── unit/              # Unit tests for isolated functions/modules
├── integration/       # Integration tests for API endpoints, DB operations
├── e2e/              # End-to-end tests with Playwright
├── fixtures/         # Test data, seed files, sample payloads
├── helpers/          # Test utilities, setup/teardown functions
└── mocks/            # Mock implementations for external services
```

## Quick Start

### Prerequisites

```bash
# Install dependencies (run from root)
npm install

# Start test database (PostgreSQL)
docker run -d -p 5433:5432 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=test \
  -e POSTGRES_DB=ageless_literature_test \
  --name ageless-lit-test-db \
  postgres:15-alpine

# Run migrations for test DB
NODE_ENV=test npm run test:db:migrate
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests only
npm run test:e2e            # E2E tests only

# Watch mode (for development)
npm run test:watch

# With coverage
npm run test:coverage

# CI mode (no watch, fail fast)
npm run test:ci
```

## Test Categories

### Unit Tests (`/unit`)
- Pure function logic
- Validation schemas
- Utility functions
- Business logic calculations
- No external dependencies

**Example:** `tests/unit/validators.test.js`

### Integration Tests (`/integration`)
- API endpoint testing
- Database operations
- Socket.IO events
- Service layer testing
- Mock external services (SendGrid, Twilio, Stripe)

**Example:** `tests/integration/api/notifications.test.js`

### E2E Tests (`/e2e`)
- Complete user journeys
- Browser automation with Playwright
- Full stack testing (frontend + backend)
- Real user interactions

**Example:** `tests/e2e/buyer-purchase-flow.spec.ts`

## Mock Strategy

All external services are mocked in tests:

- **SendGrid (Email)**: `tests/mocks/sendgrid.js`
- **Twilio (SMS)**: `tests/mocks/twilio.js`
- **Stripe**: `tests/mocks/stripe.js`
- **PayPal**: `tests/mocks/paypal.js`

Mocks are automatically applied via Jest setup files.

## Test Database

Tests use the dev PostgreSQL database with transaction-based isolation:

```env
# .env (dev environment, used for tests)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ageless_literature
```

**Isolation Strategy:**
- Each test suite runs in a transaction
- Transactions are rolled back after each test
- No persistent test data remains in database
- Safe to run alongside development work

## Writing Tests

### Unit Test Example

```javascript
// tests/unit/utils/calculations.test.js
import { calculateOrderTotal } from '../../../apps/api/src/utils/calculations';

describe('calculateOrderTotal', () => {
  it('should calculate total with tax and shipping', () => {
    const items = [
      { price: 10.00, quantity: 2 },
      { price: 5.00, quantity: 1 }
    ];
    const tax = 0.08;
    const shipping = 5.00;
    
    const total = calculateOrderTotal(items, tax, shipping);
    
    expect(total).toBe(27.00);
  });
});
```

### Integration Test Example

```javascript
// tests/integration/api/auth.test.js
import request from 'supertest';
import app from '../../../apps/api/src/server';
import { testUsers } from '../../fixtures/users';

describe('POST /api/auth/login', () => {
  it('should return JWT token for valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUsers.buyer.email,
        password: testUsers.buyer.password
      });
    
    expect(response.status).toBe(200);
    expect(response.body.data.token).toBeDefined();
    expect(response.body.data.user.email).toBe(testUsers.buyer.email);
  });
});
```

### E2E Test Example

```typescript
// tests/e2e/auth/login.spec.ts
import { test, expect } from '@playwright/test';

test('buyer can login and see dashboard', async ({ page }) => {
  await page.goto('http://localhost:3000/auth/login');
  
  await page.fill('input[name="email"]', 'buyer@test.com');
  await page.fill('input[name="password"]', 'Test123!@#');
  await page.click('button[type="submit"]');
  
  await expect(page).toHaveURL('http://localhost:3000/account');
  await expect(page.locator('h1')).toContainText('My Account');
});
```

## Debugging Tests

### Enable verbose output

```bash
DEBUG=* npm test
```

### Run single test file

```bash
npm test -- tests/integration/api/notifications.test.js
```

### Run tests matching pattern

```bash
npm test -- --testNamePattern="should create notification"
```

### Debug with VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## CI/CD Integration

Tests run automatically in GitHub Actions:

```yaml
# .github/workflows/test.yml
- name: Run Tests
  env:
    NODE_ENV: test
    DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
  run: npm run test:ci
```

## Troubleshooting

### Database Connection Issues

```bash
# Check if test DB is running
docker ps | grep ageless-lit-test-db

# Restart test DB
docker restart ageless-lit-test-db

# View DB logs
docker logs ageless-lit-test-db
```

### Port Conflicts

```bash
# Kill processes on test ports
lsof -ti:3000,3001,5433 | xargs kill -9
```

### Stale Test Data

```bash
# Reset test database
NODE_ENV=test npm run test:db:reset
```

## Coverage Goals

| Area | Target Coverage |
|------|----------------|
| API Controllers | ≥80% |
| Services | ≥75% |
| Models | ≥70% |
| Utilities | ≥90% |
| E2E Critical Paths | 100% |

## Contributing

When adding new features:

1. Write tests FIRST (TDD approach)
2. Ensure all tests pass: `npm test`
3. Check coverage: `npm run test:coverage`
4. Add E2E tests for user-facing features
5. Update this README if adding new test patterns

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [Supertest Guide](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://testingjavascript.com/)
