/**
 * Migration: Add wp_vendor_id column to vendors table
 *
 * Adds wp_vendor_id field for syncing with WordPress vendor IDs
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add wp_vendor_id to vendors table
    await queryInterface.addColumn('vendors', 'wp_vendor_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'WordPress vendor/user ID for data sync',
    });

    // Add index for wp_vendor_id
    await queryInterface.addIndex('vendors', ['wp_vendor_id'], {
      name: 'vendors_wp_vendor_id_idx',
    });

    console.log('✅ Added wp_vendor_id column and index to vendors table');
  },

  async down(queryInterface, Sequelize) {
    // Remove index first
    await queryInterface.removeIndex('vendors', 'vendors_wp_vendor_id_idx');

    // Remove wp_vendor_id column
    await queryInterface.removeColumn('vendors', 'wp_vendor_id');

    console.log('✅ Removed wp_vendor_id column and index from vendors table');
  },
};
