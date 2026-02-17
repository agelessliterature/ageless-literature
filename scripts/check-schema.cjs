/**
 * Check Database Schema
 * Shows what columns exist in the users table
 */

(async () => {
  try {
    const { default: db } = await import('../apps/api/src/models/index.js');
    
    console.log('Querying users table schema...');
    const result = await db.sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `, { type: db.sequelize.QueryTypes.SELECT });
    
    console.log('\nColumns in users table:');
    result.forEach(col => {
      console.log(`  ${col.column_name} (${col.data_type}) - Nullable: ${col.is_nullable}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
})();
