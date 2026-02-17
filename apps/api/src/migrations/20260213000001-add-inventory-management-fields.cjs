/**
 * Migration: Add Inventory Management Fields
 * - Adds 'sold' and 'archived' statuses to books enum
 * - Adds trackQuantity field to books table
 * - Updates products status to include 'sold'
 * Created: Feb 13, 2026
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 1. Check if enum exists and create/update it
      const booksDescription = await queryInterface.describeTable('books');
      
      // If status column doesn't exist, create it with all values
      if (!booksDescription.status) {
        await queryInterface.addColumn('books', 'status', {
          type: Sequelize.ENUM('draft', 'pending', 'published', 'sold', 'archived'),
          allowNull: false,
          defaultValue: 'published'
        }, { transaction });
        
        await queryInterface.addIndex('books', ['status'], {
          name: 'books_status',
          transaction
        });
      } else {
        // Status column exists, check if enum type exists before adding values
        const [enumExists] = await queryInterface.sequelize.query(`
          SELECT EXISTS (
            SELECT 1 FROM pg_type WHERE typname = 'enum_books_status'
          );
        `, { transaction });
        
        if (enumExists[0].exists) {
          // Enum exists, add new values
          await queryInterface.sequelize.query(`
            ALTER TYPE "enum_books_status" ADD VALUE IF NOT EXISTS 'sold';
          `, { transaction });
          
          await queryInterface.sequelize.query(`
            ALTER TYPE "enum_books_status" ADD VALUE IF NOT EXISTS 'archived';
          `, { transaction });
        } else {
          console.log('Enum type does not exist, skipping enum value addition');
        }
      }

      // 2. Add trackQuantity to books table if it doesn't exist
      if (!booksDescription.track_quantity) {
        await queryInterface.addColumn('books', 'track_quantity', {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          comment: 'Whether to track inventory quantity for this book'
        }, { transaction });

        console.log('Added track_quantity column to books table');
      }

      // 3. Ensure quantity column exists and has proper constraints
      if (booksDescription.quantity) {
        await queryInterface.changeColumn('books', 'quantity', {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1,
          comment: 'Available quantity in stock'
        }, { transaction });
      }

      // 4. Set books with quantity = 0 to 'sold' status
      await queryInterface.sequelize.query(`
        UPDATE books 
        SET status = 'sold' 
        WHERE quantity = 0 AND status = 'published';
      `, { transaction });

      // 5. Add index on quantity for performance
      await queryInterface.addIndex('books', ['quantity'], {
        name: 'books_quantity_idx',
        concurrently: false,
        transaction
      });

      await transaction.commit();
      console.log('Successfully added inventory management fields');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Remove index
      await queryInterface.removeIndex('books', 'books_quantity_idx', { transaction });
      
      // Remove trackQuantity column
      await queryInterface.removeColumn('books', 'track_quantity', { transaction });
      
      // Note: Cannot remove enum values in PostgreSQL easily, would require recreating the type
      // This is acceptable as additional enum values don't break functionality
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
