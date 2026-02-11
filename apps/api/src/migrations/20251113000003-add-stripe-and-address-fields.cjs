/**
 * Migration: Add Stripe customer ID, payment method ID, and address fields to users
 * Date: 2025-11-13
 * Purpose: Support Stripe payment methods and billing/shipping addresses
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('users');
    
    // Add Stripe customer ID column if it doesn't exist
    if (!tableInfo.stripe_customer_id) {
      await queryInterface.addColumn('users', 'stripe_customer_id', {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Stripe customer ID for payment processing',
      });
    }

    // Add default payment method ID column if it doesn't exist
    if (!tableInfo.default_payment_method_id) {
      await queryInterface.addColumn('users', 'default_payment_method_id', {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Default Stripe payment method ID',
      });
    }

    // Add billing address column (JSONB) if it doesn't exist
    if (!tableInfo.billing_address) {
      await queryInterface.addColumn('users', 'billing_address', {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Billing address stored as JSON',
      });
    }

    // Add shipping address column (JSONB) if it doesn't exist
    if (!tableInfo.shipping_address) {
      await queryInterface.addColumn('users', 'shipping_address', {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Shipping address stored as JSON',
      });
    }

    // Add indexes for performance
    try {
      await queryInterface.addIndex('users', ['stripe_customer_id'], {
        name: 'idx_users_stripe_customer_id',
      });
    } catch (e) {
      // Index may already exist
    }

    try {
      await queryInterface.addIndex('users', ['default_payment_method_id'], {
        name: 'idx_users_default_payment_method_id',
      });
    } catch (e) {
      // Index may already exist
    }
  },

  down: async (queryInterface, _Sequelize) => {
    // Remove indexes
    await queryInterface.removeIndex('users', 'idx_users_default_payment_method_id');
    await queryInterface.removeIndex('users', 'idx_users_stripe_customer_id');

    // Remove columns
    await queryInterface.removeColumn('users', 'shipping_address');
    await queryInterface.removeColumn('users', 'billing_address');
    await queryInterface.removeColumn('users', 'default_payment_method_id');
    await queryInterface.removeColumn('users', 'stripe_customer_id');
  },
};
