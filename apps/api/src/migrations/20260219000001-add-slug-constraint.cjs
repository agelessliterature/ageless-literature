/* eslint-disable no-unused-vars */
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Now that we have data, make slug non-nullable and add unique constraint
    await queryInterface.changeColumn('membership_plans', 'slug', {
      type: Sequelize.STRING,
      allowNull: false,
    });

    // Add unique index on slug
    await queryInterface.addIndex('membership_plans', ['slug'], {
      unique: true,
      name: 'membership_plans_slug_unique',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('membership_plans', 'membership_plans_slug_unique');
    await queryInterface.changeColumn('membership_plans', 'slug', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
};
