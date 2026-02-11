/**
 * Migration: Add Polymorphic Fields to Auctions
 * Adds auctionable_type and auctionable_id columns to support both books and products
 * Created: Jan 6, 2026
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('auctions');
    
    // Add auctionable_type column if it doesn't exist
    if (!tableDescription.auctionable_type) {
      await queryInterface.addColumn('auctions', 'auctionable_type', {
        type: Sequelize.ENUM('book', 'product'),
        allowNull: true,
        comment: 'Type of item being auctioned: book or product',
      });
    }

    // Add auctionable_id column if it doesn't exist
    if (!tableDescription.auctionable_id) {
      await queryInterface.addColumn('auctions', 'auctionable_id', {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'ID of the book or product being auctioned',
      });
    }

    // Add starts_at column if it doesn't exist
    if (!tableDescription.starts_at) {
      await queryInterface.addColumn('auctions', 'starts_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    // Add ends_at column if it doesn't exist
    if (!tableDescription.ends_at) {
      await queryInterface.addColumn('auctions', 'ends_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    // Add starting_bid column if it doesn't exist
    if (!tableDescription.starting_bid) {
      await queryInterface.addColumn('auctions', 'starting_bid', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      });
    }

    // Add bid_count column if it doesn't exist
    if (!tableDescription.bid_count) {
      await queryInterface.addColumn('auctions', 'bid_count', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
      });
    }

    // Update existing records to populate new fields from old fields
    await queryInterface.sequelize.query(`
      UPDATE auctions 
      SET 
        auctionable_type = COALESCE(auctionable_type, 'book'),
        auctionable_id = COALESCE(auctionable_id, book_id::text),
        starts_at = COALESCE(starts_at, start_date),
        ends_at = COALESCE(ends_at, end_date),
        starting_bid = COALESCE(starting_bid, starting_price)
      WHERE auctionable_type IS NULL OR auctionable_id IS NULL
    `);

    // Add indexes for new columns (check if they don't exist)
    const indexes = await queryInterface.showIndex('auctions');
    const indexNames = indexes.map(idx => idx.name);
    
    if (!indexNames.includes('auctions_auctionable_type_auctionable_id')) {
      await queryInterface.addIndex('auctions', ['auctionable_type', 'auctionable_id'], {
        name: 'auctions_auctionable_type_auctionable_id'
      });
    }
    
    if (!indexNames.includes('auctions_starts_at')) {
      await queryInterface.addIndex('auctions', ['starts_at'], {
        name: 'auctions_starts_at'
      });
    }
    
    if (!indexNames.includes('auctions_ends_at')) {
      await queryInterface.addIndex('auctions', ['ends_at'], {
        name: 'auctions_ends_at'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes if they exist
    try {
      await queryInterface.removeIndex('auctions', 'auctions_auctionable_type_auctionable_id');
    } catch (e) {}
    
    try {
      await queryInterface.removeIndex('auctions', 'auctions_starts_at');
    } catch (e) {}
    
    try {
      await queryInterface.removeIndex('auctions', 'auctions_ends_at');
    } catch (e) {}

    // Remove columns
    await queryInterface.removeColumn('auctions', 'auctionable_type');
    await queryInterface.removeColumn('auctions', 'auctionable_id');
    await queryInterface.removeColumn('auctions', 'starts_at');
    await queryInterface.removeColumn('auctions', 'ends_at');
    await queryInterface.removeColumn('auctions', 'starting_bid');
    await queryInterface.removeColumn('auctions', 'bid_count');
  },
};
