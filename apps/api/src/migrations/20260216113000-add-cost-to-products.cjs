/**
 * Migration: Add cost column to products
 * Ensures Product.cost exists for profit calculations.
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const table = await queryInterface.describeTable('products');

      if (!table.cost) {
        await queryInterface.addColumn(
          'products',
          'cost',
          {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
            comment: 'Cost basis for profit calculations',
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

      if (table.cost) {
        await queryInterface.removeColumn('products', 'cost', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
