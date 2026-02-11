'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add status enum type
    await queryInterface.sequelize.query(`
      CREATE TYPE enum_users_status AS ENUM ('active', 'inactive', 'pending', 'revoked');
    `);

    // Add status column to users table with default 'active'
    await queryInterface.addColumn('users', 'status', {
      type: Sequelize.ENUM('active', 'inactive', 'pending', 'revoked'),
      allowNull: false,
      defaultValue: 'active',
      comment: 'User account status: active (normal users/verified), inactive (disabled), pending (awaiting verification), revoked (banned)'
    });

    // Add index on status for performance
    await queryInterface.addIndex('users', ['status'], {
      name: 'users_status_idx'
    });

    // Set all existing users to 'active' status
    await queryInterface.sequelize.query(`
      UPDATE users SET status = 'active' WHERE status IS NULL;
    `);

    console.log('SUCCESS: Added status field to users table with default "active"');
  },

  async down(queryInterface, Sequelize) {
    // Remove index
    await queryInterface.removeIndex('users', 'users_status_idx');

    // Remove column
    await queryInterface.removeColumn('users', 'status');

    // Drop enum type
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS enum_users_status;
    `);

    console.log('SUCCESS: Removed status field from users table');
  }
};
