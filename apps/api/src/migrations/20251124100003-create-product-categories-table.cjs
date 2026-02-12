/**
 * Migration: Create Product Categories Junction Table
 * Links products to categories (many-to-many)
 * Created: Nov 24, 2025
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('product_categories', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      product_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'products', key: 'id' },
        onDelete: 'CASCADE',
      },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'categories', key: 'id' },
        onDelete: 'CASCADE',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('product_categories', ['product_id']);
    await queryInterface.addIndex('product_categories', ['category_id']);
    await queryInterface.addIndex('product_categories', ['product_id', 'category_id'], { unique: true });

    console.log('✅ Product categories junction table created');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('product_categories');
    console.log('✅ Product categories junction table dropped');
  },
};
