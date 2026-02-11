/**
 * Database Sync Script
 * Synchronizes Sequelize models with the database schema
 * 
 * WARNING: This should only be used in local development!
 * Use migrations (npm run migrate) for production environments.
 * 
 * Usage: npm run db:sync
 */

import db from './models/index.js';

const syncDatabase = async () => {
  try {
    console.log('🔄 Starting database synchronization...\n');
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('Database:', process.env.DATABASE_URL ? '✓ Connected' : '✗ Not configured');
    
    // Prevent accidental use in production
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ ERROR: Database sync should not be used in production!');
      console.error('Use migrations instead: npm run migrate');
      process.exit(1);
    }

    // Sync all models with the database
    // alter: true - Updates existing tables to match models (safer than force)
    // force: false - Does not drop tables before recreating them
    await db.sequelize.sync({ alter: true });

    console.log('\n✅ Database synchronized successfully!');
    console.log('\nModels synced:');
    Object.keys(db).forEach((modelName) => {
      if (modelName !== 'sequelize' && modelName !== 'Sequelize') {
        console.log(`  - ${modelName}`);
      }
    });

    console.log('\n💡 Note: For production, use migrations: npm run migrate');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database sync failed:');
    console.error(error);
    process.exit(1);
  }
};

syncDatabase();
