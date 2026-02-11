/**
 * Migration: Add social media link fields to vendors table
 * Date: 2025-11-13
 * Description: Adds Facebook, Twitter, Instagram, and LinkedIn URL fields
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('vendors', 'social_facebook', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Facebook profile or page URL',
    });

    await queryInterface.addColumn('vendors', 'social_twitter', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Twitter/X profile URL',
    });

    await queryInterface.addColumn('vendors', 'social_instagram', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Instagram profile URL',
    });

    await queryInterface.addColumn('vendors', 'social_linkedin', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'LinkedIn profile or company URL',
    });
  },

  down: async (queryInterface, _Sequelize) => {
    await queryInterface.removeColumn('vendors', 'social_linkedin');
    await queryInterface.removeColumn('vendors', 'social_instagram');
    await queryInterface.removeColumn('vendors', 'social_twitter');
    await queryInterface.removeColumn('vendors', 'social_facebook');
  },
};
