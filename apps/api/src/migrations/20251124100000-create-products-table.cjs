'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('products', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      vendor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'vendors',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      title: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      description: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      sale_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      condition: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      condition_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      category: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      tags: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      sku: {
        type: Sequelize.STRING(100),
        allowNull: true,
        unique: true,
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      images: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      slug: {
        type: Sequelize.STRING(600),
        allowNull: false,
        unique: true,
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'draft',
      },
      published_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      year_made: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      origin: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      artist: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      dimensions: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      weight: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      materials: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      is_signed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_authenticated: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      meta_title: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      meta_description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      views: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      favorite_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Add indexes
    await queryInterface.addIndex('products', ['vendor_id']);
    await queryInterface.addIndex('products', ['slug'], { unique: true });
    await queryInterface.addIndex('products', ['category']);
    await queryInterface.addIndex('products', ['status']);
    await queryInterface.addIndex('products', ['condition']);
    await queryInterface.addIndex('products', ['price']);
    await queryInterface.addIndex('products', ['created_at']);
    await queryInterface.addIndex('products', ['published_at']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('products');
  },
};
