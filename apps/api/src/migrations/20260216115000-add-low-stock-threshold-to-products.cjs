/**
 * Migration: Add low_stock_threshold column to products
 * Ensures Product.lowStockThreshold exists for inventory alerts.
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const table = await queryInterface.describeTable('products');

      if (!table.low_stock_threshold) {
        await queryInterface.addColumn(
          'products',
          'low_stock_threshold',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            comment: 'Alert threshold for low stock',
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

      if (table.low_stock_threshold) {
        await queryInterface.removeColumn('products', 'low_stock_threshold', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
