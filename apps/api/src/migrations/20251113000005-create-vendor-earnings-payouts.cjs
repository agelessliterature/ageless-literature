/**
 * Migration: Create Vendor Earnings and Payouts Tables
 * Date: 2025-11-13
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if tables exist
    const tables = await queryInterface.showAllTables();
    
    // Create vendor_payouts table if it doesn't exist
    if (!tables.includes('vendor_payouts')) {
      await queryInterface.createTable('vendor_payouts', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        vendor_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'vendors', key: 'id' },
          onDelete: 'CASCADE',
        },
        amount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.0,
        },
        status: {
          type: Sequelize.STRING(50),
          defaultValue: 'pending',
        },
        method: {
          type: Sequelize.STRING(100),
          allowNull: true,
        },
        transaction_id: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
      });
    }

    // Create vendor_earnings table if it doesn't exist
    if (!tables.includes('vendor_earnings')) {
      await queryInterface.createTable('vendor_earnings', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        vendor_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'vendors', key: 'id' },
          onDelete: 'CASCADE',
        },
        order_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'orders', key: 'id' },
          onDelete: 'SET NULL',
        },
        gross_amount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.0,
        },
        platform_commission: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.0,
        },
        vendor_earnings: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.0,
        },
        paid_out: {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
        },
        payout_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'vendor_payouts', key: 'id' },
          onDelete: 'SET NULL',
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
      });
    }

    // Add indexes
    try {
      await queryInterface.addIndex('vendor_earnings', ['vendor_id'], {
        name: 'idx_vendor_earnings_vendor_id',
      });
    } catch (e) {
      // Index may already exist
    }

    try {
      await queryInterface.addIndex('vendor_payouts', ['vendor_id'], {
        name: 'idx_vendor_payouts_vendor_id',
      });
    } catch (e) {
      // Index may already exist
    }
  },

  down: async (queryInterface, _Sequelize) => {
    await queryInterface.dropTable('vendor_earnings');
    await queryInterface.dropTable('vendor_payouts');
  },
};
