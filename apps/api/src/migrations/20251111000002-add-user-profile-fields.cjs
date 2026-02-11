/**
 * Migration: Add User Profile Fields
 * Adds username, bio, location, avatarUrl, and preference fields
 * Created: Nov 11, 2025
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'username', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
    });

    await queryInterface.addColumn('users', 'bio', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn('users', 'location', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('users', 'avatar_url', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('users', 'default_currency', {
      type: Sequelize.STRING(3),
      defaultValue: 'USD',
      allowNull: false,
    });

    await queryInterface.addColumn('users', 'default_language', {
      type: Sequelize.STRING(2),
      defaultValue: 'en',
      allowNull: false,
    });

    await queryInterface.addColumn('users', 'newsletter_opt_in', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    });

    await queryInterface.addColumn('users', 'theme_preference', {
      type: Sequelize.ENUM('light', 'dark', 'auto'),
      defaultValue: 'auto',
      allowNull: false,
    });

    await queryInterface.addColumn('users', 'notification_preferences', {
      type: Sequelize.JSONB,
      defaultValue: {
        email: {
          orders: true,
          auctions: true,
          outbid: true,
          marketing: false,
        },
        push: {
          orders: true,
          auctions: true,
          outbid: true,
          marketing: false,
        },
      },
      allowNull: false,
    });

    // Add index for username
    await queryInterface.addIndex('users', ['username']);
  },

  down: async (queryInterface, _Sequelize) => {
    await queryInterface.removeColumn('users', 'notification_preferences');
    await queryInterface.removeColumn('users', 'theme_preference');
    await queryInterface.removeColumn('users', 'newsletter_opt_in');
    await queryInterface.removeColumn('users', 'default_language');
    await queryInterface.removeColumn('users', 'default_currency');
    await queryInterface.removeColumn('users', 'avatar_url');
    await queryInterface.removeColumn('users', 'location');
    await queryInterface.removeColumn('users', 'bio');
    await queryInterface.removeColumn('users', 'username');
  },
};
