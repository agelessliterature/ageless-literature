/**
 * Simple Admin Creation Script
 * Uses only basic columns that exist in the initial migration
 * Works even if later migrations haven't been run
 * 
 * Credentials:
 *   Email: admin@agelessliterature.local
 *   Password: password
 * 
 * Usage: node create-admin-simple.cjs
 */

(async () => {
  try {
    const bcrypt = await import('bcrypt');
    const pg = await import('pg');
    const { Client } = pg.default;
    
    // Database connection from environment
    const client = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'ageless_literature',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });
    
    await client.connect();
    console.log('✓ Database connected');
    
    const adminEmail = 'admin@agelessliterature.local';
    const adminPassword = 'password';
    
    // Check if admin already exists
    const checkResult = await client.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [adminEmail]
    );
    
    if (checkResult.rows.length > 0) {
      const admin = checkResult.rows[0];
      console.log('✓ Admin account already exists');
      console.log('  Email:', admin.email);
      console.log('  Password: password');
      console.log('  Role:', admin.role);
      console.log('  ID:', admin.id);
      await client.end();
      process.exit(0);
    }
    
    // Hash the password
    const passwordHash = await bcrypt.default.hash(adminPassword, 10);
    
    // Insert admin user using only basic columns
    const insertResult = await client.query(
      `INSERT INTO users (email, hash, first_name, last_name, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, email, role`,
      [adminEmail, passwordHash, 'Admin', 'User', 'admin']
    );
    
    const admin = insertResult.rows[0];
    
    console.log('✓ Admin account created successfully!');
    console.log('  Email:', admin.email);
    console.log('  Password: password');
    console.log('  Role:', admin.role);
    console.log('  ID:', admin.id);
    console.log('');
    console.log('You can now login with:');
    console.log('  Email: admin@agelessliterature.local');
    console.log('  Password: password');
    
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('✗ Error creating admin account:', error.message);
    console.error(error);
    process.exit(1);
  }
})();
