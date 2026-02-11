/**
 * Migration: Add menu_order column to books and products tables
 * 
 * Adds menu_order field for custom sorting, matching WordPress menu_order functionality
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add menu_order to books table
    await queryInterface.addColumn('books', 'menu_order', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Custom sort order (matches WordPress menu_order)',
    });

    // Add index for efficient sorting
    await queryInterface.addIndex('books', ['menu_order'], {
      name: 'books_menu_order_idx',
    });

    // Add menu_order to products table
    await queryInterface.addColumn('products', 'menu_order', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Custom sort order (matches WordPress menu_order)',
    });

    // Add index for efficient sorting
    await queryInterface.addIndex('products', ['menu_order'], {
      name: 'products_menu_order_idx',
    });

    console.log('✅ Added menu_order columns and indexes to books and products');
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes
    await queryInterface.removeIndex('books', 'books_menu_order_idx');
    await queryInterface.removeIndex('products', 'products_menu_order_idx');

    // Remove columns
    await queryInterface.removeColumn('books', 'menu_order');
    await queryInterface.removeColumn('products', 'menu_order');

    console.log('✅ Removed menu_order columns and indexes from books and products');
  },
};
