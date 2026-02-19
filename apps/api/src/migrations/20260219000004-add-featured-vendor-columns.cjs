/* eslint-disable no-unused-vars */
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('vendors');
    
    if (!tableInfo.is_featured) {
      await queryInterface.addColumn('vendors', 'is_featured', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      });
    }

    if (!tableInfo.featured_start_date) {
      await queryInterface.addColumn('vendors', 'featured_start_date', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    if (!tableInfo.featured_end_date) {
      await queryInterface.addColumn('vendors', 'featured_end_date', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    if (!tableInfo.featured_priority) {
      await queryInterface.addColumn('vendors', 'featured_priority', {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      });
    }

    console.log('✅ Featured vendor columns added');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('vendors', 'is_featured');
    await queryInterface.removeColumn('vendors', 'featured_start_date');
    await queryInterface.removeColumn('vendors', 'featured_end_date');
    await queryInterface.removeColumn('vendors', 'featured_priority');
  },
};
