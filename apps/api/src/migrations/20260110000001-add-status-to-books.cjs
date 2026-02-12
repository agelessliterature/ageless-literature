/**
 * Migration: Add Status to Books
 * Adds status column (draft, pending, published) to books table
 * Books with price=0 or NULL are set to draft status
 * Created: Jan 10, 2026
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('books');
    
    // Add status column if it doesn't exist
    if (!tableDescription.status) {
      await queryInterface.addColumn('books', 'status', {
        type: Sequelize.ENUM('draft', 'pending', 'published'),
        allowNull: false,
        defaultValue: 'published'
      });

      // Add index for status column
      await queryInterface.addIndex('books', ['status'], {
        name: 'books_status',
      });

      // Update existing books: set status to 'draft' where price is 0 or null
      await queryInterface.sequelize.query(
        "UPDATE books SET status = 'draft' WHERE price = 0 OR price IS NULL"
      );

      console.log('Added status column to books table and set draft status for 0-price books');
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.removeIndex('books', 'books_status');
    } catch (e) {}
    
    await queryInterface.removeColumn('books', 'status');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_books_status";');
  },
};
