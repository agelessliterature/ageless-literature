'use strict';

const { v4: uuidv4 } = require('crypto');

function generateSid() {
  return Math.random().toString(36).substring(2, 8) + '-' + Math.random().toString(36).substring(2, 8);
}

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add sid column to books table
    await queryInterface.addColumn('books', 'sid', {
      type: Sequelize.STRING(20),
      allowNull: true,
      unique: true,
    });

    // Add sid column to products table
    await queryInterface.addColumn('products', 'sid', {
      type: Sequelize.STRING(20),
      allowNull: true,
      unique: true,
    });

    // Generate SIDs for existing books
    const books = await queryInterface.sequelize.query(
      'SELECT id FROM books',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    for (const book of books) {
      const sid = generateSid();
      await queryInterface.sequelize.query(
        'UPDATE books SET sid = :sid WHERE id = :id',
        {
          replacements: { sid, id: book.id },
          type: queryInterface.sequelize.QueryTypes.UPDATE
        }
      );
    }

    // Generate SIDs for existing products
    const products = await queryInterface.sequelize.query(
      'SELECT id FROM products',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    for (const product of products) {
      const sid = generateSid();
      await queryInterface.sequelize.query(
        'UPDATE products SET sid = :sid WHERE id = :id',
        {
          replacements: { sid, id: product.id },
          type: queryInterface.sequelize.QueryTypes.UPDATE
        }
      );
    }

    // Now make sid NOT NULL
    await queryInterface.changeColumn('books', 'sid', {
      type: Sequelize.STRING(20),
      allowNull: false,
      unique: true,
    });

    await queryInterface.changeColumn('products', 'sid', {
      type: Sequelize.STRING(20),
      allowNull: false,
      unique: true,
    });

    // Add indexes
    await queryInterface.addIndex('books', ['sid'], {
      name: 'books_sid_idx',
      unique: true,
    });

    await queryInterface.addIndex('products', ['sid'], {
      name: 'products_sid_idx',
      unique: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('books', 'books_sid_idx');
    await queryInterface.removeIndex('products', 'products_sid_idx');
    await queryInterface.removeColumn('books', 'sid');
    await queryInterface.removeColumn('products', 'sid');
  },
};
