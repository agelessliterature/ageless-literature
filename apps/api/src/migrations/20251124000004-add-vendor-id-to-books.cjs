'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('books', 'vendor_id', {
      type: Sequelize.INTEGER,
      allowNull: true, // Allow null initially for existing books
      references: {
        model: 'vendors',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    // Add index for better query performance
    await queryInterface.addIndex('books', ['vendor_id'], {
      name: 'idx_books_vendor_id',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('books', 'idx_books_vendor_id');
    await queryInterface.removeColumn('books', 'vendor_id');
  },
};
