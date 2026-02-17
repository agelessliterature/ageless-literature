/**
 * Migration: Add views column to books
 * Ensures the books table has a views counter aligned with the Book model.
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const table = await queryInterface.describeTable('books');

      if (!table.views) {
        await queryInterface.addColumn(
          'books',
          'views',
          {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: 'View count',
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
      const table = await queryInterface.describeTable('books');

      if (table.views) {
        await queryInterface.removeColumn('books', 'views', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
