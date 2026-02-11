/**
 * Migration: Remove banner fields from users table
 * Created: 2025-11-13
 * Description: Users only need profile pictures, not banners. Banners are only for vendors.
 */

'use strict';

module.exports = {
  up: async (queryInterface, _Sequelize) => {
    const tableInfo = await queryInterface.describeTable('users');
    
    if (tableInfo.banner_photo_url) {
      await queryInterface.removeColumn('users', 'banner_photo_url');
    }
    
    if (tableInfo.banner_photo_public_id) {
      await queryInterface.removeColumn('users', 'banner_photo_public_id');
    }
  },

  down: async (queryInterface, Sequelize) => {
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
  },
};
