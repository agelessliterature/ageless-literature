'use strict';

/**
 * Migration: Add short_description to books and products tables
 * Created: Dec 22, 2025
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add short_description to books table
    await queryInterface.addColumn('books', 'short_description', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Brief description for listings and previews',
    });

    // Add short_description to products table
    await queryInterface.addColumn('products', 'short_description', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Brief description for listings and previews',
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove short_description from books table
    await queryInterface.removeColumn('books', 'short_description');

    // Remove short_description from products table
    await queryInterface.removeColumn('products', 'short_description');
  },
};
