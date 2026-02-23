/**
 * Migration: Add Inventory Management Fields
 * - Adds 'sold' and 'archived' statuses to books enum
 * - Adds track_quantity field to books table
 * - Updates books status to include 'sold'
 * Created: Feb 13, 2026
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Check if books table has status column
    const booksDescription = await queryInterface.describeTable('books');

    // If status column doesn't exist, create it with full enum
    if (!booksDescription.status) {
      await queryInterface.addColumn('books', 'status', {
        type: Sequelize.ENUM('draft', 'pending', 'published', 'sold', 'archived'),
        allowNull: false,
        defaultValue: 'published'
      });

      await queryInterface.addIndex('books', ['status'], {
        name: 'books_status'
      });
    } else {
      // Check if enum type exists
      const [enumExists] = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'enum_books_status'
        );
      `);

      if (enumExists[0].exists) {
        // Add new enum values (Postgres safe syntax)
        await queryInterface.sequelize.query(`
          ALTER TYPE "enum_books_status" ADD VALUE IF NOT EXISTS 'sold';
        `);

        await queryInterface.sequelize.query(`
          ALTER TYPE "enum_books_status" ADD VALUE IF NOT EXISTS 'archived';
        `);
      }
    }

    // 2. Add track_quantity column if it doesn't exist
    if (!booksDescription.track_quantity) {
      await queryInterface.addColumn('books', 'track_quantity', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether to track inventory quantity for this book'
      });

      console.log('Added track_quantity column to books table');
    }

    // 3. Ensure quantity column has proper constraints
    if (booksDescription.quantity) {
      await queryInterface.changeColumn('books', 'quantity', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Available quantity in stock'
      });
    }

    // 4. Now safely update rows using new enum value
    await queryInterface.sequelize.query(`
      UPDATE books 
      SET status = 'sold' 
      WHERE quantity = 0 AND status = 'published';
    `);

    // 5. Add index on quantity
    await queryInterface.addIndex('books', ['quantity'], {
      name: 'books_quantity_idx'
    });

    console.log('Successfully added inventory management fields');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('books', 'books_quantity_idx');
    await queryInterface.removeColumn('books', 'track_quantity');

    // Note:
    // PostgreSQL does not easily allow removing enum values.
    // We intentionally leave 'sold' and 'archived' in place.
  }
};

// 🔥 CRITICAL: Disable transactions for this migration
module.exports.useTransaction = false;
