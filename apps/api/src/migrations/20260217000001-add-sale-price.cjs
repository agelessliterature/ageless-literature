/**
 * Migration: Add sale_price to books and products
 * Allows vendors to offer discounted prices on items.
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const booksTable = await queryInterface.describeTable('books');
      if (!booksTable.sale_price) {
        await queryInterface.addColumn(
          'books',
          'sale_price',
          {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
            comment: 'Discounted/sale price if item is on sale',
          },
          { transaction },
        );
      }

      const productsTable = await queryInterface.describeTable('products');
      if (!productsTable.sale_price) {
        await queryInterface.addColumn(
          'products',
          'sale_price',
          {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
            comment: 'Discounted/sale price if item is on sale',
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
      const booksTable = await queryInterface.describeTable('books');
      if (booksTable.sale_price) {
        await queryInterface.removeColumn('books', 'sale_price', { transaction });
      }

      const productsTable = await queryInterface.describeTable('products');
      if (productsTable.sale_price) {
        await queryInterface.removeColumn('products', 'sale_price', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
