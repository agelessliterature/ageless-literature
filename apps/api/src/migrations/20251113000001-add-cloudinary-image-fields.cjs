/**
 * Migration: Add Cloudinary image fields to users and vendors
 * Created: 2025-11-13
 * Description: Adds profile/banner image URLs and public IDs for Cloudinary integration
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add image fields to users table
    await queryInterface.addColumn('users', 'profile_photo_url', {
      type: Sequelize.STRING(500),
      allowNull: true,
      comment: 'Cloudinary URL for user profile photo',
    });

    await queryInterface.addColumn('users', 'profile_photo_public_id', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Cloudinary public_id for profile photo deletion',
    });

    await queryInterface.addColumn('users', 'banner_photo_url', {
      type: Sequelize.STRING(500),
      allowNull: true,
      comment: 'Cloudinary URL for user banner/cover photo',
    });

    await queryInterface.addColumn('users', 'banner_photo_public_id', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Cloudinary public_id for banner deletion',
    });

    // Add image fields to vendors table
    await queryInterface.addColumn('vendors', 'logo_url', {
      type: Sequelize.STRING(500),
      allowNull: true,
      comment: 'Cloudinary URL for vendor logo',
    });

    await queryInterface.addColumn('vendors', 'logo_public_id', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Cloudinary public_id for logo deletion',
    });

    await queryInterface.addColumn('vendors', 'banner_url', {
      type: Sequelize.STRING(500),
      allowNull: true,
      comment: 'Cloudinary URL for vendor banner/cover photo',
    });

    await queryInterface.addColumn('vendors', 'banner_public_id', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Cloudinary public_id for banner deletion',
    });
  },

  down: async (queryInterface, _Sequelize) => {
    // Remove fields from vendors table
    await queryInterface.removeColumn('vendors', 'banner_public_id');
    await queryInterface.removeColumn('vendors', 'banner_url');
    await queryInterface.removeColumn('vendors', 'logo_public_id');
    await queryInterface.removeColumn('vendors', 'logo_url');

    // Remove fields from users table
    await queryInterface.removeColumn('users', 'banner_photo_public_id');
    await queryInterface.removeColumn('users', 'banner_photo_url');
    await queryInterface.removeColumn('users', 'profile_photo_public_id');
    await queryInterface.removeColumn('users', 'profile_photo_url');
  },
};
