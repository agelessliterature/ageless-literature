/**
 * Migration: Add initiated_by column to custom_offers
 * Tracks whether the offer was initiated by a vendor or a buyer
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('custom_offers', 'initiated_by', {
      type: Sequelize.ENUM('vendor', 'buyer'),
      allowNull: false,
      defaultValue: 'vendor',
      comment: 'Who initiated the offer: vendor or buyer',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('custom_offers', 'initiated_by');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_custom_offers_initiated_by";');
  },
};
