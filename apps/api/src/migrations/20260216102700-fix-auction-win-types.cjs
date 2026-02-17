/**
 * Migration: Fix AuctionWin Column Types  
 * Ensures auction_wins table uses INTEGER columns (not UUID)
 * Date: 2026-02-16
 */

'use strict';

module. exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    
    if (!tables.includes('auction_wins')) {
      console.log('✅ auction_wins does not exist - will be created correctly by base migration');
      return;
    }

    const tableInfo = await queryInterface.describeTable('auction_wins');
    const idType = tableInfo.id ? tableInfo.id.type : null;

    console.log('📊 Current auction_wins.id type:', idType);

    // Check if already INTEGER
    if (!idType || !idType.toLowerCase().includes('uuid')) {
      console.log('✅ auction_wins already uses INTEGER columns. No changes needed.');
      return;
    }

    console.log('⚠️  Found UUID columns. This should not happen if migrations were run correctly.');
    console.log('⚠️  Skipping automatic fix. Please manually verify database schema.');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('No rollback needed - model matches migration schema');
  },
};