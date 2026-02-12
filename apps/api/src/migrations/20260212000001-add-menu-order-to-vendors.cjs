/**
 * Migration: Add menu_order column to vendors table
 *
 * Adds menu_order field for custom sorting of vendors
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add menu_order to vendors table
    await queryInterface.addColumn('vendors', 'menu_order', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'Display order for vendors (lower = higher priority)',
    });

    // Add index for menu_order
    await queryInterface.addIndex('vendors', ['menu_order'], {
      name: 'vendors_menu_order_idx',
    });

    console.log('✅ Added menu_order column and index to vendors table');
  },

  async down(queryInterface, Sequelize) {
    // Remove index first
    await queryInterface.removeIndex('vendors', 'vendors_menu_order_idx');

    // Remove menu_order column
    await queryInterface.removeColumn('vendors', 'menu_order');

    console.log('✅ Removed menu_order column and index from vendors table');
  },
};
