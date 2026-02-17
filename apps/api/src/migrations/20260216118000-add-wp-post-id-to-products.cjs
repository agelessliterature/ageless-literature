/**
 * Migration: Add wp_post_id field to products
 * Ensures Product.wpPostId exists in database.
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const table = await queryInterface.describeTable('products');

      // Add wp_post_id field
      if (!table.wp_post_id) {
        await queryInterface.addColumn(
          'products',
          'wp_post_id',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            comment: 'Original WordPress post ID for reference',
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

      // Remove wp_post_id field
      if (table.wp_post_id) {
        await queryInterface.removeColumn('products', 'wp_post_id', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
