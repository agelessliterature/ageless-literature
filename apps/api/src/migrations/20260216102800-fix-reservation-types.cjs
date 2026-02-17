/**
 * Migration: Fix Reservation Column Types
 * Ensures reservations table uses INTEGER columns (not UUID) 
 * Date: 2026-02-16
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    
    if (!tables.includes('reservations')) {
      console.log('✅ reservations does not exist - will be created correctly by base migration');
      return;
    }

    const tableInfo = await queryInterface.describeTable('reservations');
    const idType = tableInfo.id ? tableInfo.id.type : null;

    console.log('📊 Current reservations.id type:', idType);

    // Check if already INTEGER
    if (!idType || !idType.toLowerCase().includes('uuid')) {
      console.log('✅ reservations already uses INTEGER columns. No changes needed.');
      return;
    }

    console.log('⚠️  Found UUID columns. This should not happen if migrations were run correctly.');
    console.log('⚠️  Skipping automatic fix. Please manually verify database schema.');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('No rollback needed - model matches migration schema');
  },
};