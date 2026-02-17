/**
 * Migration: Add SEO fields to products
 * Ensures Product.seoTitle and seoDescription exist in database.
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const table = await queryInterface.describeTable('products');

      // Add seo_title field
      if (!table.seo_title) {
        await queryInterface.addColumn(
          'products',
          'seo_title',
          {
            type: Sequelize.STRING(200),
            allowNull: true,
            comment: 'SEO meta title',
          },
          { transaction },
        );
      }

      // Add seo_description field
      if (!table.seo_description) {
        await queryInterface.addColumn(
          'products',
          'seo_description',
          {
            type: Sequelize.TEXT,
            allowNull: true,
            comment: 'SEO meta description',
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

      // Remove SEO fields
      if (table.seo_description) {
        await queryInterface.removeColumn('products', 'seo_description', { transaction });
      }
      if (table.seo_title) {
        await queryInterface.removeColumn('products', 'seo_title', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
