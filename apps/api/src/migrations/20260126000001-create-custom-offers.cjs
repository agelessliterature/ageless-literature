/**
 * Migration: Create Custom Offers Table
 * Allows vendors to send custom price offers to specific users
 * Created: Jan 26, 2026
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('custom_offers', {
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
        onDelete: 'CASCADE',
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      item_type: {
        type: Sequelize.ENUM('book', 'product'),
        allowNull: false,
      },
      item_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      original_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      offer_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('pending', 'accepted', 'declined', 'expired', 'cancelled'),
        defaultValue: 'pending',
        allowNull: false,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      responded_at: {
        type: Sequelize.DATE,
        allowNull: true,
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

    await queryInterface.addIndex('custom_offers', ['vendor_id'], {
      name: 'custom_offers_vendor_id',
    });
    await queryInterface.addIndex('custom_offers', ['user_id'], {
      name: 'custom_offers_user_id',
    });
    await queryInterface.addIndex('custom_offers', ['item_type', 'item_id'], {
      name: 'custom_offers_item',
    });
    await queryInterface.addIndex('custom_offers', ['status'], {
      name: 'custom_offers_status',
    });
    await queryInterface.addIndex('custom_offers', ['expires_at'], {
      name: 'custom_offers_expires_at',
    });

    console.log('Created custom_offers table with indexes');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('custom_offers');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_custom_offers_item_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_custom_offers_status";');
  },
};
