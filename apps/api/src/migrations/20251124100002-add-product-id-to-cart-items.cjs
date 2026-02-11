'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add product_id column to cart_items table
    await queryInterface.addColumn('cart_items', 'product_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'products',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    // Make book_id nullable since items can now be either books or products
    await queryInterface.changeColumn('cart_items', 'book_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'books',
        key: 'id',
      },
      onDelete: 'CASCADE',
    });

    // Add index on product_id
    await queryInterface.addIndex('cart_items', ['product_id']);

    // Add check constraint to ensure either book_id or product_id is set (but not both)
    await queryInterface.sequelize.query(`
      ALTER TABLE cart_items 
      ADD CONSTRAINT cart_items_item_type_check 
      CHECK (
        (book_id IS NOT NULL AND product_id IS NULL) OR 
        (book_id IS NULL AND product_id IS NOT NULL)
      );
    `);
  },

  async down(queryInterface, Sequelize) {
    // Remove check constraint
    await queryInterface.sequelize.query(`
      ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_item_type_check;
    `);

    // Remove index
    await queryInterface.removeIndex('cart_items', ['product_id']);

    // Remove product_id column
    await queryInterface.removeColumn('cart_items', 'product_id');

    // Make book_id non-nullable again
    await queryInterface.changeColumn('cart_items', 'book_id', {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'books',
        key: 'id',
      },
      onDelete: 'CASCADE',
    });
  },
};
