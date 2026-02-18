// create-admin.mjs
import bcrypt from 'bcrypt';
import db from './src/models/index.js'; // make sure this is the correct path

async function createAdmin() {
  try {
    await db.sequelize.authenticate();
    console.log('DB connected');

    const passwordHash = await bcrypt.hash('password', 10); // change to a secure password

    const existing = await db.User.findOne({ where: { email: 'admin@agelessliterature.local' } });
    if (existing) {
      console.log('Admin already exists:', existing.email);
      process.exit(0);
    }

    const admin = await db.User.create({
      email: 'admin@agelessliterature.local',
      password: passwordHash,
      role: 'admin',
      name: 'Local Admin',
    });

    console.log('Admin created:', admin.email);
    process.exit(0);
  } catch (err) {
    console.error('Error creating admin:', err);
    process.exit(1);
  }
}

createAdmin();
