/**
 * Migration: Add business_address and billing_address fields to vendors
 * Date: 2025-11-13
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('vendors', 'business_address', {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'Business address: street, city, state, country, postalCode',
    });

    await queryInterface.addColumn('vendors', 'billing_address', {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'Billing address: street, city, state, country, postalCode',
    });
  },

  down: async (queryInterface, _Sequelize) => {
    await queryInterface.removeColumn('vendors', 'billing_address');
    await queryInterface.removeColumn('vendors', 'business_address');
  },
};
