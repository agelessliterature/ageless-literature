/**
 * Migration: Create Auction Tables
 * Creates auctions, auction_bids, auction_wins tables
 * Created: Nov 11, 2025
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create auctions table
    await queryInterface.createTable('auctions', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      book_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'books', key: 'id' },
        onDelete: 'CASCADE',
      },
      vendor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'vendors', key: 'id' },
        onDelete: 'CASCADE',
      },
      starting_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      current_bid: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      reserve_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      start_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      end_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('upcoming', 'active', 'ended', 'sold', 'cancelled'),
        defaultValue: 'upcoming',
      },
      winner_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add indexes for auctions
    await queryInterface.addIndex('auctions', ['book_id']);
    await queryInterface.addIndex('auctions', ['vendor_id']);
    await queryInterface.addIndex('auctions', ['status']);
    await queryInterface.addIndex('auctions', ['end_date']);
    await queryInterface.addIndex('auctions', ['winner_id']);

    // Create auction_bids table
    await queryInterface.createTable('auction_bids', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      auction_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'auctions', key: 'id' },
        onDelete: 'CASCADE',
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('active', 'outbid', 'winning', 'won', 'lost'),
        defaultValue: 'active',
      },
      is_auto_bid: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add indexes for auction_bids
    await queryInterface.addIndex('auction_bids', ['auction_id']);
    await queryInterface.addIndex('auction_bids', ['user_id']);
    await queryInterface.addIndex('auction_bids', ['auction_id', 'user_id']);
    await queryInterface.addIndex('auction_bids', ['created_at']);

    // Create auction_wins table
    await queryInterface.createTable('auction_wins', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      auction_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'auctions', key: 'id' },
        onDelete: 'CASCADE',
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      order_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'orders', key: 'id' },
        onDelete: 'SET NULL',
      },
      winning_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      paid_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('pending', 'claimed', 'paid', 'completed'),
        defaultValue: 'pending',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add indexes for auction_wins
    await queryInterface.addIndex('auction_wins', ['user_id']);
    await queryInterface.addIndex('auction_wins', ['order_id']);
    await queryInterface.addIndex('auction_wins', ['status']);
  },

  down: async (queryInterface, _Sequelize) => {
    await queryInterface.dropTable('auction_wins');
    await queryInterface.dropTable('auction_bids');
    await queryInterface.dropTable('auctions');
  },
};
