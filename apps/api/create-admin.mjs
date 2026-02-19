/**
 * Create Admin Account Script
 * Creates an admin user with credentials:
 *   Email: admin@agelessliterature.local
 *   Password: password
 * 
 * Usage: node create-admin.mjs
 */
import db from './src/models/index.js';

async function createAdmin() {
  try {
    await db.sequelize.authenticate();
    console.log('✓ Database connected');

    const adminEmail = 'admin@agelessliterature.local';
    const adminPassword = 'password';

    // Check if admin already exists
    const existing = await db.User.findOne({ where: { email: adminEmail } });
    if (existing) {
      console.log('✓ Admin account already exists:', existing.email);
      console.log('  Email:', adminEmail);
      console.log('  Password: password');
      console.log('  Role:', existing.role);
      process.exit(0);
    }

    // Create admin user (password will be auto-hashed by beforeCreate hook)
    const admin = await db.User.create({
      email: adminEmail,
      password: adminPassword, // Plain password - will be hashed by model hook
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      status: 'active',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      provider: 'credentials',
      defaultLanguage: 'en',
    });

    console.log('✓ Admin account created successfully!');
    console.log('  Email:', admin.email);
    console.log('  Password: password');
    console.log('  Role:', admin.role);
    console.log('  ID:', admin.id);
    process.exit(0);
  } catch (err) {
    console.error('✗ Error creating admin:', err.message);
    console.error(err);
    process.exit(1);
  }
}

createAdmin();
