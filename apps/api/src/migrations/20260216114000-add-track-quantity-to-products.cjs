/**
 * Migration: Add track_quantity column to products
 * Ensures Product.trackQuantity exists for inventory tracking.
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const table = await queryInterface.describeTable('products');

      if (!table.track_quantity) {
        await queryInterface.addColumn(
          'products',
          'track_quantity',
          {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            comment: 'Whether to track inventory quantity',
          },
          { transaction },
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const table = await queryInterface.describeTable('products');

      if (table.track_quantity) {
        await queryInterface.removeColumn('products', 'track_quantity', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
