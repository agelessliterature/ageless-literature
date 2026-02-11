'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('categories', 'image_url', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('categories', 'image_public_id', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('categories', 'image_url');
    await queryInterface.removeColumn('categories', 'image_public_id');
  },
};
