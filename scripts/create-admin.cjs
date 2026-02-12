/**
 * Create Admin Account Script
 * Creates an admin user in the database using raw SQL
 * Usage: node scripts/create-admin.cjs
 */

(async () => {
  try {
    const bcrypt = await import('bcrypt');
    const { default: db } = await import('../apps/api/src/models/index.js');
    
    const adminEmail = 'admin@agelessliterature.local';
    const adminPassword = 'password';
    
    // Check if admin already exists
    const existingAdmin = await db.sequelize.query(
      'SELECT * FROM users WHERE email = ?',
      { replacements: [adminEmail], type: db.sequelize.QueryTypes.SELECT }
    );
    
    if (existingAdmin.length > 0) {
      console.log('✓ Admin account already exists:', adminEmail);
      process.exit(0);
    }
    
    // Hash the password
    const passwordHash = await bcrypt.default.hash(adminPassword, 10);
    
    // Insert admin user directly using raw SQL
    const result = await db.sequelize.query(
      `INSERT INTO users (email, hash, first_name, last_name, role, status, default_language, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
       RETURNING id, email, role`,
      { replacements: [adminEmail, passwordHash, 'Admin', 'User', 'admin', 'active', 'en'] }
    );
    
    const admin = result[0][0];
    
    console.log('✓ Admin account created successfully!');
    console.log('  Email:', admin.email);
    console.log('  Role:', admin.role);
    console.log('  ID:', admin.id);
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Error creating admin account:', error.message);
    console.error(error);
    process.exit(1);
  }
})();
