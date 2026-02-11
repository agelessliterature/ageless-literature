/**
 * Jest Global Teardown
 * Runs once after all test suites - cleans up test data
 */

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ageless_literature';

module.exports = async () => {
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    console.log('[GLOBAL TEARDOWN] Cleaning test data...');
    
    // Clean up in correct order (foreign key dependencies)
    await pool.query("DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@test.com')");
    await pool.query("DELETE FROM vendors WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@test.com')");
    await pool.query("DELETE FROM users WHERE email LIKE '%@test.com'");
    
    console.log('[GLOBAL TEARDOWN] Test data cleaned');
  } catch (error) {
    console.error('[GLOBAL TEARDOWN] Error cleaning test data:', error.message);
  } finally {
    await pool.end();
  }
};
