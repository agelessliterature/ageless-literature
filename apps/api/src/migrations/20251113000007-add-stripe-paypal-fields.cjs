/**
 * Migration: Add Stripe and PayPal payout fields to vendors table
 * Date: 2025-11-13
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('vendors');
    
    // Add payout_method column if it doesn't exist
    if (!tableInfo.payout_method) {
      await queryInterface.addColumn('vendors', 'payout_method', {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'Vendor payout preference: stripe or paypal',
      });
    }

    // Add stripe_account_id column if it doesn't exist
    if (!tableInfo.stripe_account_id) {
      await queryInterface.addColumn('vendors', 'stripe_account_id', {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Stripe Connect account ID for automatic payouts',
      });
    }

    // Add stripe_account_status column if it doesn't exist
    if (!tableInfo.stripe_account_status) {
      await queryInterface.addColumn('vendors', 'stripe_account_status', {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'Status of Stripe Connect account',
      });
    }

    // Add paypal_email column if it doesn't exist
    if (!tableInfo.paypal_email) {
      await queryInterface.addColumn('vendors', 'paypal_email', {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'PayPal email for manual/API payouts',
      });
    }

    // Add check constraints using raw SQL (ignore if exists)
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE vendors 
        ADD CONSTRAINT vendors_payout_method_check 
        CHECK (payout_method IN ('stripe', 'paypal'));
      `);
    } catch (e) {
      // Constraint may already exist
    }

    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE vendors 
        ADD CONSTRAINT vendors_stripe_account_status_check 
        CHECK (stripe_account_status IN ('pending', 'active', 'restricted', 'inactive'));
      `);
    } catch (e) {
      // Constraint may already exist
    }

    // Update vendor_payouts method column constraint
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE vendor_payouts DROP CONSTRAINT IF EXISTS vendor_payouts_method_check;
        ALTER TABLE vendor_payouts 
        ADD CONSTRAINT vendor_payouts_method_check 
        CHECK (method IN ('stripe', 'paypal'));
      `);
    } catch (e) {
      // Constraint operations may fail if table doesn't exist or constraint exists
    }
  },

  down: async (queryInterface, _Sequelize) => {
    // Remove constraints
    await queryInterface.sequelize.query(`
      ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_stripe_account_status_check;
      ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_payout_method_check;
    `);

    // Remove columns
    await queryInterface.removeColumn('vendors', 'paypal_email');
    await queryInterface.removeColumn('vendors', 'stripe_account_status');
    await queryInterface.removeColumn('vendors', 'stripe_account_id');
    await queryInterface.removeColumn('vendors', 'payout_method');
  },
};
