/**
 * Quick DB query to see vendors table structure
 */

import db from '../models/index.js';

async function checkTable() {
  try {
    const [results] = await db.sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'vendors'
      ORDER BY ordinal_position;
    `);

    console.log('📋 Vendors table columns:\n');
    results.forEach((col) => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkTable();
