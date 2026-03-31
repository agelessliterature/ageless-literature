/**
 * Migration: Create high_spots table
 * Stores admin-configurable High Spots showcases for the public page.
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('high_spots', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      items: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('high_spots', ['created_at'], {
      name: 'high_spots_created_at_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('high_spots', 'high_spots_created_at_idx');
    await queryInterface.dropTable('high_spots');
  },
};
