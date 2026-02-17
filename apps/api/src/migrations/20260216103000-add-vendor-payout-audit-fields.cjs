'use strict';

/**
 * Migration: Add processed_by and payout_notes to vendor_payouts table
 * 
 * Purpose:
 * - Add processed_by to track which admin processed a payout
 * - Add payout_notes for admin comments about payouts
 * 
 * Safety: Checks column existence before adding
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    
    if (!tables.includes('vendor_payouts')) {
      console.log('Table vendor_payouts does not exist, skipping migration');
      return;
    }

    const tableDescription = await queryInterface.describeTable('vendor_payouts');
    
    // Add processed_by column if it doesn't exist
    if (!tableDescription.processed_by) {
      console.log('Adding processed_by column to vendor_payouts');
      await queryInterface.addColumn('vendor_payouts', 'processed_by', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }

    // Add payout_notes column if it doesn't exist
    if (!tableDescription.payout_notes) {
      console.log('Adding payout_notes column to vendor_payouts');
      await queryInterface.addColumn('vendor_payouts', 'payout_notes', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }

    console.log('Migration completed: vendor_payouts audit fields added');
  },

  down: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    
    if (!tables.includes('vendor_payouts')) {
      console.log('Table vendor_payouts does not exist, skipping rollback');
      return;
    }

    const tableDescription = await queryInterface.describeTable('vendor_payouts');
    
    // Remove payout_notes column if it exists
    if (tableDescription.payout_notes) {
      console.log('Removing payout_notes column from vendor_payouts');
      await queryInterface.removeColumn('vendor_payouts', 'payout_notes');
    }

    // Remove processed_by column if it exists
    if (tableDescription.processed_by) {
      console.log('Removing processed_by column from vendor_payouts');
      await queryInterface.removeColumn('vendor_payouts', 'processed_by');
    }

    console.log('Rollback completed: vendor_payouts audit fields removed');
  },
};
