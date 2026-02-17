/**
 * Migration: Add compare_at_price to products
 * Ensures Product.compareAtPrice exists for discount displays.
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const table = await queryInterface.describeTable('products');

      if (!table.compare_at_price) {
        await queryInterface.addColumn(
          'products',
          'compare_at_price',
          {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
            comment: 'Compare at price (original/MSRP for discounts)',
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

      if (table.compare_at_price) {
        await queryInterface.removeColumn('products', 'compare_at_price', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
