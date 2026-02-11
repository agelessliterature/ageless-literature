'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add indexes for books table to optimize queries
    // These improve performance for filtering, sorting, and searching
    // Note: Only index real database columns, not VIRTUAL fields
    
    // Helper to check if index exists
    const indexExists = async (indexName) => {
      const result = await queryInterface.sequelize.query(
        `SELECT 1 FROM pg_indexes WHERE indexname = '${indexName}'`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      return result.length > 0;
    };

    // Index on vendor_id for vendor-specific queries
    if (!(await indexExists('idx_books_vendor_id'))) {
      await queryInterface.addIndex('books', ['vendor_id'], {
        name: 'idx_books_vendor_id',
      });
      console.log('SUCCESS: Created idx_books_vendor_id');
    }

    // Composite index for vendor + created_at (common vendor query pattern)
    if (!(await indexExists('idx_books_vendor_created_at'))) {
      await queryInterface.addIndex('books', ['vendor_id', 'created_at'], {
        name: 'idx_books_vendor_created_at',
      });
      console.log('SUCCESS: Created idx_books_vendor_created_at');
    }

    // Index on price for price range queries
    if (!(await indexExists('idx_books_price'))) {
      await queryInterface.addIndex('books', ['price'], {
        name: 'idx_books_price',
      });
      console.log('SUCCESS: Created idx_books_price');
    }

    // Index on condition for filtering
    if (!(await indexExists('idx_books_condition'))) {
      await queryInterface.addIndex('books', ['condition'], {
        name: 'idx_books_condition',
      });
      console.log('SUCCESS: Created idx_books_condition');
    }

    // Composite index for price + created_at (common sort pattern)
    if (!(await indexExists('idx_books_price_created_at'))) {
      await queryInterface.addIndex('books', ['price', 'created_at'], {
        name: 'idx_books_price_created_at',
      });
      console.log('SUCCESS: Created idx_books_price_created_at');
    }

    console.log('SUCCESS: Books table indexes migration completed');
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes in reverse order
    const indexes = [
      'idx_books_price_created_at',
      'idx_books_condition',
      'idx_books_price',
      'idx_books_vendor_created_at',
      'idx_books_vendor_id',
    ];

    for (const indexName of indexes) {
      try {
        await queryInterface.removeIndex('books', indexName);
        console.log(`SUCCESS: Removed ${indexName}`);
      } catch (error) {
        console.log(`WARNING: Index ${indexName} not found, skipping`);
      }
    }
    
    console.log('SUCCESS: Books table indexes rollback completed');
  }
};
