// vendorAuth middleware integration tests
// See PHASE4_VENDOR_AUTH_VERIFICATION.md for manual test procedures

import request from 'supertest';
import app from '../../../apps/api/src/server.js';

describe('Vendor Auth Middleware', () => {
  test('should block unauthenticated requests', async () => {
    const res = await request(app).get('/api/vendor/profile');
    expect(res.status).toBe(401);
  });

  test('should allow approved vendors', async () => {
    // TODO: Add test with approved vendor token
    expect(true).toBe(true);
  });
});
