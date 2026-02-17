'use strict';

/**
 * Migration: Add Missing User Fields
 * Adds email verification, session tracking, and preference fields
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Add email verification status fields
      await queryInterface.addColumn('users', 'email_verified', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });

      await queryInterface.addColumn('users', 'email_verified_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });

      // Add session tracking fields
      await queryInterface.addColumn('users', 'last_login_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });

      await queryInterface.addColumn('users', 'last_logout_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });

      await queryInterface.addColumn('users', 'is_online', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      });

      // Add notification preference fields
      await queryInterface.addColumn('users', 'email_notifications', {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      });

      await queryInterface.addColumn('users', 'marketing_emails', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      });

      // Add timezone preference
      await queryInterface.addColumn('users', 'timezone', {
        type: Sequelize.STRING(50),
        defaultValue: 'UTC',
        allowNull: false,
      });

      // Add metadata field
      await queryInterface.addColumn('users', 'metadata', {
        type: Sequelize.JSONB,
        defaultValue: {},
        allowNull: false,
      });

      // Add indexes for frequently queried fields
      await queryInterface.addIndex('users', ['email_verified']);
      await queryInterface.addIndex('users', ['is_online']);
      await queryInterface.addIndex('users', ['last_login_at']);

      console.log('✓ Migration completed: Added missing user fields');
    } catch (error) {
      console.error('✗ Migration error:', error.message);
      throw error;
    }
  },

  down: async (queryInterface, _Sequelize) => {
    try {
      // Remove indexes
      await queryInterface.removeIndex('users', ['email_verified']);
      await queryInterface.removeIndex('users', ['is_online']);
      await queryInterface.removeIndex('users', ['last_login_at']);

      // Remove columns
      await queryInterface.removeColumn('users', 'metadata');
      await queryInterface.removeColumn('users', 'timezone');
      await queryInterface.removeColumn('users', 'marketing_emails');
      await queryInterface.removeColumn('users', 'email_notifications');
      await queryInterface.removeColumn('users', 'is_online');
      await queryInterface.removeColumn('users', 'last_logout_at');
      await queryInterface.removeColumn('users', 'last_login_at');
      await queryInterface.removeColumn('users', 'email_verified_at');
      await queryInterface.removeColumn('users', 'email_verified');

      console.log('✓ Migration rolled back: Removed user fields');
    } catch (error) {
      console.error('✗ Migration rollback error:', error.message);
      throw error;
    }
  }
};
