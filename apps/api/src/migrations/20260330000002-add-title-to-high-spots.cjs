'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('high_spots', 'title', {
      type: Sequelize.STRING(255),
      allowNull: false,
      defaultValue: 'High Spots',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('high_spots', 'title');
  },
};
