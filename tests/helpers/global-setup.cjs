/**
 * Jest Global Setup
 * Runs once before all test suites - seeds test data
 */

const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ageless_literature';

// Test user definitions
const testUsers = {
  buyer: {
    email: 'buyer@test.com',
    password: 'Test123!@#',
    first_name: 'Test',
    last_name: 'Buyer',
    role: 'customer',
    default_language: 'en'
  },
  vendor: {
    email: 'vendor@test.com',
    password: 'Test123!@#',
    first_name: 'Test',
    last_name: 'Vendor',
    role: 'vendor',
    default_language: 'en'
  },
  admin: {
    email: 'admin@test.com',
    password: 'Test123!@#',
    first_name: 'Test',
    last_name: 'Admin',
    role: 'admin',
    default_language: 'en'
  }
};

module.exports = async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    console.log('[GLOBAL SETUP] Seeding test data...');
    
    // Check if test users already exist
    const existingCheck = await pool.query(
      "SELECT id FROM users WHERE email = 'buyer@test.com'"
    );
    
    if (existingCheck.rows.length > 0) {
      console.log('[GLOBAL SETUP] Test data already exists, reusing...');
      return;
    }
    
    // Hash password once for all users
    const hashedPassword = await bcrypt.hash('Test123!@#', 10);
    
    // Create test users
    for (const [key, userData] of Object.entries(testUsers)) {
      const result = await pool.query(`
        INSERT INTO users (email, hash, first_name, last_name, role, default_language, email_verified, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
        ON CONFLICT (email) DO NOTHING
        RETURNING id
      `, [userData.email, hashedPassword, userData.first_name, userData.last_name, userData.role, userData.default_language]);
      
      // Create vendor record if this is the vendor user
      if (key === 'vendor' && result.rows.length > 0) {
        await pool.query(`
          INSERT INTO vendors (user_id, shop_name, shop_url, business_description, status, created_at, updated_at)
          VALUES ($1, 'Test Rare Books', 'test-rare-books', 'A test vendor shop', 'active', NOW(), NOW())
          ON CONFLICT (user_id) DO NOTHING
        `, [result.rows[0].id]);
      }
    }
    
    console.log('[GLOBAL SETUP] Test data seeded successfully');
  } catch (error) {
    console.error('[GLOBAL SETUP] Error seeding test data:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
};
