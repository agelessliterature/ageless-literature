/**
 * Migration: Add OAuth Fields to Users Table
 * Date: 2025-11-11
 * Purpose: Support Google and Apple OAuth authentication
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add OAuth-related columns
    await queryInterface.addColumn('users', 'image', {
      type: Sequelize.STRING(500),
      allowNull: true,
    });

    await queryInterface.addColumn('users', 'provider', {
      type: Sequelize.STRING(50),
      allowNull: true,
      defaultValue: 'credentials',
    });

    await queryInterface.addColumn('users', 'provider_id', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });

    await queryInterface.addColumn('users', 'first_name', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });

    await queryInterface.addColumn('users', 'last_name', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });

    // Add indexes for OAuth provider lookups
    await queryInterface.addIndex('users', ['provider'], {
      name: 'idx_users_provider',
    });

    await queryInterface.addIndex('users', ['provider_id'], {
      name: 'idx_users_provider_id',
    });

    await queryInterface.addIndex('users', ['provider', 'provider_id'], {
      name: 'idx_users_provider_composite',
    });

    // Update existing users to set default provider
    await queryInterface.sequelize.query(
      `UPDATE users SET provider = 'credentials' WHERE provider IS NULL;`
    );

    // Make passwordHash nullable for OAuth users
    await queryInterface.changeColumn('users', 'password_hash', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
  },

  down: async (queryInterface, _Sequelize) => {
    // Remove indexes
    await queryInterface.removeIndex('users', 'idx_users_provider_composite');
    await queryInterface.removeIndex('users', 'idx_users_provider_id');
    await queryInterface.removeIndex('users', 'idx_users_provider');

    // Remove columns
    await queryInterface.removeColumn('users', 'last_name');
    await queryInterface.removeColumn('users', 'first_name');
    await queryInterface.removeColumn('users', 'provider_id');
    await queryInterface.removeColumn('users', 'provider');
    await queryInterface.removeColumn('users', 'image');

    // Restore password_hash to NOT NULL
    await queryInterface.changeColumn('users', 'password_hash', {
      type: Sequelize.STRING(255),
      allowNull: false,
    });
  },
};
