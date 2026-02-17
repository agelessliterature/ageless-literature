'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    
    if (!tables.includes('vendor_earnings')) {
      console.log('Table vendor_earnings does not exist, skipping migration');
      return;
    }

    const tableDescription = await queryInterface.describeTable('vendor_earnings');
    
    if (tableDescription.gross_amount && !tableDescription.amount) {
      console.log('Renaming gross_amount to amount');
      await queryInterface.renameColumn('vendor_earnings', 'gross_amount', 'amount');
    }
    
    if (tableDescription.platform_commission && !tableDescription.platform_fee) {
      console.log('Renaming platform_commission to platform_fee');
      await queryInterface.renameColumn('vendor_earnings', 'platform_commission', 'platform_fee');
    }
    
    if (tableDescription.vendor_earnings && !tableDescription.net_amount) {
      console.log('Renaming vendor_earnings to net_amount');
      await queryInterface.renameColumn('vendor_earnings', 'vendor_earnings', 'net_amount');
    }
    
    if (!tableDescription.status) {
      console.log('Adding status column');
      await queryInterface.addColumn('vendor_earnings', 'status', {
        type: Sequelize.STRING(20),
        allowNull: true,
        defaultValue: 'pending',
      });
    }
    
    if (!tableDescription.paid_at) {
      console.log('Adding paid_at column');
      await queryInterface.addColumn('vendor_earnings', 'paid_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
    
    if (!tableDescription.description) {
      console.log('Adding description column');
      await queryInterface.addColumn('vendor_earnings', 'description', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }
    
    if (!tableDescription.commission_rate_bps) {
      console.log('Adding commission_rate_bps column');
      await queryInterface.addColumn('vendor_earnings', 'commission_rate_bps', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }
    
    if (!tableDescription.transaction_type) {
      console.log('Adding transaction_type column');
      await queryInterface.addColumn('vendor_earnings', 'transaction_type', {
        type: Sequelize.STRING(50),
        allowNull: true,
      });
    }
    
    if (!tableDescription.completed_at) {
      console.log('Adding completed_at column');
      await queryInterface.addColumn('vendor_earnings', 'completed_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
    
    console.log('Migration completed: vendor_earnings schema updated');
  },

  down: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    
    if (!tables.includes('vendor_earnings')) {
      return;
    }

    const tableDescription = await queryInterface.describeTable('vendor_earnings');
    
    if (tableDescription.completed_at) {
      await queryInterface.removeColumn('vendor_earnings', 'completed_at');
    }
    if (tableDescription.transaction_type) {
      await queryInterface.removeColumn('vendor_earnings', 'transaction_type');
    }
    if (tableDescription.commission_rate_bps) {
      await queryInterface.removeColumn('vendor_earnings', 'commission_rate_bps');
    }
    if (tableDescription.description) {
      await queryInterface.removeColumn('vendor_earnings', 'description');
    }
    if (tableDescription.paid_at) {
      await queryInterface.removeColumn('vendor_earnings', 'paid_at');
    }
    if (tableDescription.status) {
      await queryInterface.removeColumn('vendor_earnings', 'status');
    }
    
    if (tableDescription.net_amount) {
      await queryInterface.renameColumn('vendor_earnings', 'net_amount', 'vendor_earnings');
    }
    if (tableDescription.platform_fee) {
      await queryInterface.renameColumn('vendor_earnings', 'platform_fee', 'platform_commission');
    }
    if (tableDescription.amount) {
      await queryInterface.renameColumn('vendor_earnings', 'amount', 'gross_amount');
    }
  },
};
