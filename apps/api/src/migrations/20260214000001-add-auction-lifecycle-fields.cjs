/**
 * Migration: Add Auction Lifecycle Fields
 * Extends auction table with end-state management, policies, and inventory locking
 * Created: Feb 14, 2026
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      const tableDescription = await queryInterface.describeTable('auctions');
      
      // Status column is already VARCHAR(20) in PostgreSQL, no enum alteration needed
      // The model validates status values at the application level
      
      // Add ended_at timestamp
      if (!tableDescription.ended_at) {
        await queryInterface.addColumn('auctions', 'ended_at', {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Timestamp when auction ended',
        }, { transaction });
      }
      
      // Add winner_bid_id reference
      if (!tableDescription.winner_bid_id) {
        await queryInterface.addColumn('auctions', 'winner_bid_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'auction_bids', key: 'id' },
          onDelete: 'SET NULL',
          comment: 'ID of the winning bid',
        }, { transaction });
        
        await queryInterface.addIndex('auctions', ['winner_bid_id'], { transaction });
      }
      
      // Add end outcome reason
      if (!tableDescription.end_outcome_reason) {
        await queryInterface.addColumn('auctions', 'end_outcome_reason', {
          type: Sequelize.STRING(100),
          allowNull: true,
          comment: 'Reason for auction end state (e.g., reserve_not_met, no_bids)',
        }, { transaction });
      }
      
      // Add relist tracking
      if (!tableDescription.relist_count) {
        await queryInterface.addColumn('auctions', 'relist_count', {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: 'Number of times this auction has been relisted',
        }, { transaction });
      }
      
      if (!tableDescription.parent_auction_id) {
        await queryInterface.addColumn('auctions', 'parent_auction_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'auctions', key: 'id' },
          onDelete: 'SET NULL',
          comment: 'If relisted, points to original auction',
        }, { transaction });
        
        await queryInterface.addIndex('auctions', ['parent_auction_id'], { transaction });
      }
      
      // Add payment window
      if (!tableDescription.payment_window_hours) {
        await queryInterface.addColumn('auctions', 'payment_window_hours', {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 48,
          comment: 'Hours allowed for winner to complete payment',
        }, { transaction });
      }
      
      if (!tableDescription.payment_deadline) {
        await queryInterface.addColumn('auctions', 'payment_deadline', {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Deadline for payment (ended_at + payment_window_hours)',
        }, { transaction });
        
        await queryInterface.addIndex('auctions', ['payment_deadline'], { transaction });
      }
      
      // Add end policies
      if (!tableDescription.end_policy_on_no_sale) {
        await queryInterface.addColumn('auctions', 'end_policy_on_no_sale', {
          type: Sequelize.ENUM('NONE', 'RELIST_AUCTION', 'CONVERT_FIXED', 'UNLIST'),
          defaultValue: 'NONE',
          comment: 'Action to take when auction ends without sale',
        }, { transaction });
      }
      
      if (!tableDescription.end_policy_relist_delay_hours) {
        await queryInterface.addColumn('auctions', 'end_policy_relist_delay_hours', {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          comment: 'Hours to wait before auto-relisting',
        }, { transaction });
      }
      
      if (!tableDescription.end_policy_relist_max_count) {
        await queryInterface.addColumn('auctions', 'end_policy_relist_max_count', {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          comment: 'Maximum number of auto-relists (0 = no limit)',
        }, { transaction });
      }
      
      if (!tableDescription.end_policy_convert_price_source) {
        await queryInterface.addColumn('auctions', 'end_policy_convert_price_source', {
          type: Sequelize.ENUM('MANUAL', 'RESERVE', 'HIGHEST_BID', 'STARTING_BID'),
          defaultValue: 'MANUAL',
          comment: 'Price source when converting to fixed price',
        }, { transaction });
      }
      
      if (!tableDescription.end_policy_convert_price_markup_bps) {
        await queryInterface.addColumn('auctions', 'end_policy_convert_price_markup_bps', {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          comment: 'Markup in basis points (100 = 1%) for converted price',
        }, { transaction });
      }
      
      // Add inventory lock fields to books table
      const bookTableDesc = await queryInterface.describeTable('books');
      if (!bookTableDesc.auction_locked_until) {
        await queryInterface.addColumn('books', 'auction_locked_until', {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'If set, item cannot be sold as fixed price until this time',
        }, { transaction });
        
        await queryInterface.addIndex('books', ['auction_locked_until'], { transaction });
      }
      
      // Add inventory lock fields to products table
      const productTableDesc = await queryInterface.describeTable('products');
      if (!productTableDesc.auction_locked_until) {
        await queryInterface.addColumn('products', 'auction_locked_until', {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'If set, item cannot be sold as fixed price until this time',
        }, { transaction });
        
        await queryInterface.addIndex('products', ['auction_locked_until'], { transaction });
      }
      
      await transaction.commit();
      console.log('✓ Auction lifecycle fields added successfully');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Remove columns from auctions table
      const columns = [
        'ended_at',
        'winner_bid_id',
        'end_outcome_reason',
        'relist_count',
        'parent_auction_id',
        'payment_window_hours',
        'payment_deadline',
        'end_policy_on_no_sale',
        'end_policy_relist_delay_hours',
        'end_policy_relist_max_count',
        'end_policy_convert_price_source',
        'end_policy_convert_price_markup_bps',
      ];
      
      for (const column of columns) {
        try {
          await queryInterface.removeColumn('auctions', column, { transaction });
        } catch (e) {
          console.log(`Column ${column} may not exist, skipping...`);
        }
      }
      
      // Remove lock columns from books and products
      try {
        await queryInterface.removeColumn('books', 'auction_locked_until', { transaction });
      } catch (e) {
        console.log('Column auction_locked_until may not exist in books, skipping...');
      }
      
      try {
        await queryInterface.removeColumn('products', 'auction_locked_until', { transaction });
      } catch (e) {
        console.log('Column auction_locked_until may not exist in products, skipping...');
      }
      
      // Status column is VARCHAR(20) in PostgreSQL, no enum alteration needed
      
      await transaction.commit();
      console.log('✓ Auction lifecycle migration rolled back');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
