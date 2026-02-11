/**
 * Authentication Integration Tests
 * P0 - Critical for deployment
 */

import request from 'supertest';
import app from '../../../apps/api/src/server.js';
import { setupTestDb, teardownTestDb } from '../../helpers/db.js';
import { testUsers } from '../../fixtures/users.js';

describe('Authentication API', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  describe('POST /api/auth/login', () => {
    it('should return JWT token for valid credentials', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: testUsers.buyer.email,
        password: testUsers.buyer.password,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.email).toBe(testUsers.buyer.email);
      expect(response.body.data.user.password).toBeUndefined(); // Password should not be returned
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: testUsers.buyer.email,
        password: 'WrongPassword123',
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject non-existent user', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: 'nonexistent@test.com',
        password: 'Password123',
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should require email and password', async () => {
      const response = await request(app).post('/api/auth/login').send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/register', () => {
    it('should create new user with valid data', async () => {
      const newUser = {
        email: 'newuser@test.com',
        password: 'SecurePass!8xK#mN', // 16 chars, no sequential patterns
        firstName: 'New',
        lastName: 'User',
      };

      const response = await request(app).post('/api/auth/register').send(newUser);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(newUser.email);
      expect(response.body.data.token).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      const response = await request(app).post('/api/auth/register').send({
        email: testUsers.buyer.email, // Already exists
        password: 'Test123!@#',
        firstName: 'Test',
        lastName: 'Duplicate',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject weak password', async () => {
      const response = await request(app).post('/api/auth/register').send({
        email: 'weakpass@test.com',
        password: '12345', // Too weak
        firstName: 'Weak',
        lastName: 'Password',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken;

    beforeAll(async () => {
      // Login to get token
      const loginResponse = await request(app).post('/api/auth/login').send({
        email: testUsers.buyer.email,
        password: testUsers.buyer.password,
      });
      authToken = loginResponse.body.data.token;
    });

    it('should return current user with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUsers.buyer.email);
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject missing token', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
