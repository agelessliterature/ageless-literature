/**
 * Database Sync Script
 * Synchronizes Sequelize models with the database schema
 *
 * WARNING: This should only be used in local development!
 * Use migrations (npm run migrate) for production and existing databases.
 *
 * Usage:
 *   npm run db:sync              - Check and sync fresh database
 *   npm run db:sync -- --force   - Drop all tables and recreate (DESTRUCTIVE!)
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

    // Check for force flag
    const forceSync = process.argv.includes('--force');

    // Check if database has existing tables
    const [results] = await db.sequelize.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);

    const tableCount = parseInt(results[0].count);

    if (tableCount > 0 && !forceSync) {
      console.log(`\n⚠️  Database has ${tableCount} existing tables.`);
      console.log('\n❌ Cannot use sync on existing database with complex schemas (ENUMs, etc.)');
      console.log('\n✨ RECOMMENDED: Use migrations instead:');
      console.log('   npm run migrate\n');
      console.log('💡 Or to start fresh (DELETES ALL DATA):');
      console.log('   npm run db:sync -- --force\n');
      process.exit(1);
    }

    if (forceSync) {
      console.log('\n⚠️  WARNING: --force flag detected!');
      console.log('⚠️  This will DROP ALL TABLES and recreate them.');
      console.log('⚠️  ALL DATA WILL BE LOST!\n');

      // Wait 2 seconds to let user cancel
      await new Promise((resolve) => setTimeout(resolve, 2000));

      await db.sequelize.sync({ force: true });
      console.log('\n✅ Database forcefully synchronized (all data deleted)!');
    } else {
      // Fresh database - safe to sync
      await db.sequelize.sync();
      console.log('\n✅ Database synchronized successfully!');
    }

    console.log('\nModels synced:');
    Object.keys(db).forEach((modelName) => {
      if (modelName !== 'sequelize' && modelName !== 'Sequelize') {
        console.log(`  - ${modelName}`);
      }
    });

    console.log('\n💡 Next steps:');
    console.log('   - For schema changes: npm run migrate');
    console.log('   - For production: ALWAYS use migrations\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database sync failed:');
    console.error(error.message || error);
    console.log('\n💡 Try using migrations instead:');
    console.log('   npm run migrate\n');
    process.exit(1);
  }
};

syncDatabase();
