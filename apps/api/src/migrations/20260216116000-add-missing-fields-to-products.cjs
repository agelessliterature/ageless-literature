/**
 * Migration: Add missing fields to products
 * Ensures all Product model fields exist in database.
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const table = await queryInterface.describeTable('products');

      // Add sid field
      if (!table.sid) {
        await queryInterface.addColumn(
          'products',
          'sid',
          {
            type: Sequelize.STRING(50),
            allowNull: true, // Allow null initially, we'll update in a separate migration if needed
            comment: 'Short unique identifier for URLs',
          },
          { transaction },
        );
        await queryInterface.addIndex('products', ['sid'], {
          unique: true,
          name: 'products_sid_unique',
          transaction
        });
      }

      // Add short_description field
      if (!table.short_description) {
        await queryInterface.addColumn(
          'products',
          'short_description',
          {
            type: Sequelize.TEXT,
            allowNull: true,
            comment: 'Brief description for listings and previews',
          },
          { transaction },
        );
      }

      // Add barcode field
      if (!table.barcode) {
        await queryInterface.addColumn(
          'products',
          'barcode',
          {
            type: Sequelize.STRING(100),
            allowNull: true,
            comment: 'Product barcode',
          },
          { transaction },
        );
      }

      // Add weight_unit field
      if (!table.weight_unit) {
        await queryInterface.addColumn(
          'products',
          'weight_unit',
          {
            type: Sequelize.STRING(20),
            allowNull: true,
            comment: 'Weight unit (lb, kg, oz, g)',
          },
          { transaction },
        );
      }

      // Add requires_shipping field
      if (!table.requires_shipping) {
        await queryInterface.addColumn(
          'products',
          'requires_shipping',
          {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            comment: 'Whether product requires shipping',
          },
          { transaction },
        );
      }

      // Add taxable field
      if (!table.taxable) {
        await queryInterface.addColumn(
          'products',
          'taxable',
          {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            comment: 'Whether product is taxable',
          },
          { transaction },
        );
      }

      // Add featured_image field
      if (!table.featured_image) {
        await queryInterface.addColumn(
          'products',
          'featured_image',
          {
            type: Sequelize.STRING(500),
            allowNull: true,
            comment: 'Primary/featured product image URL',
          },
          { transaction },
        );
      }

      // Add metadata field
      if (!table.metadata) {
        await queryInterface.addColumn(
          'products',
          'metadata',
          {
            type: Sequelize.JSONB,
            allowNull: true,
            comment: 'Additional metadata stored as JSON',
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

      // Remove fields in reverse order
      if (table.metadata) {
        await queryInterface.removeColumn('products', 'metadata', { transaction });
      }
      if (table.featured_image) {
        await queryInterface.removeColumn('products', 'featured_image', { transaction });
      }
      if (table.taxable) {
        await queryInterface.removeColumn('products', 'taxable', { transaction });
      }
      if (table.requires_shipping) {
        await queryInterface.removeColumn('products', 'requires_shipping', { transaction });
      }
      if (table.weight_unit) {
        await queryInterface.removeColumn('products', 'weight_unit', { transaction });
      }
      if (table.barcode) {
        await queryInterface.removeColumn('products', 'barcode', { transaction });
      }
      if (table.short_description) {
        await queryInterface.removeColumn('products', 'short_description', { transaction });
      }
      if (table.sid) {
        await queryInterface.removeIndex('products', 'products_sid_unique', { transaction });
        await queryInterface.removeColumn('products', 'sid', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
