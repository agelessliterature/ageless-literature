'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add product_id column to order_items table
    await queryInterface.addColumn('order_items', 'product_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'products',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      after: 'book_id',
    });

    // Make book_id nullable since items can now be either books or products
    await queryInterface.changeColumn('order_items', 'book_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'books',
        key: 'id',
      },
    });

    // Add index on product_id
    await queryInterface.addIndex('order_items', ['product_id']);

    // Add check constraint to ensure either book_id or product_id is set (but not both)
    await queryInterface.sequelize.query(`
      ALTER TABLE order_items 
      ADD CONSTRAINT order_items_item_type_check 
      CHECK (
        (book_id IS NOT NULL AND product_id IS NULL) OR 
        (book_id IS NULL AND product_id IS NOT NULL)
      );
    `);
  },

  async down(queryInterface, Sequelize) {
    // Remove check constraint
    await queryInterface.sequelize.query(`
      ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_item_type_check;
    `);

    // Remove index
    await queryInterface.removeIndex('order_items', ['product_id']);

    // Remove product_id column
    await queryInterface.removeColumn('order_items', 'product_id');

    // Make book_id non-nullable again
    await queryInterface.changeColumn('order_items', 'book_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'books',
        key: 'id',
      },
    });
  },
};
