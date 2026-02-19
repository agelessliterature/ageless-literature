/* eslint-disable no-unused-vars */
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add missing columns to membership_plans table
    
    // 1. Add slug column
    await queryInterface.addColumn('membership_plans', 'slug', {
      type: Sequelize.STRING,
      allowNull: true, // Temporarily allow null
    });

    // 2. Add currency column
    await queryInterface.addColumn('membership_plans', 'currency', {
      type: Sequelize.STRING(3),
      defaultValue: 'USD',
      allowNull: false,
    });

    // 3. Add stripePriceId column
    await queryInterface.addColumn('membership_plans', 'stripe_price_id', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    // 4. Rename billing_period to interval
    await queryInterface.renameColumn('membership_plans', 'billing_period', 'interval');

    // 5. Rename active to isActive (camelCase)
    await queryInterface.renameColumn('membership_plans', 'active', 'is_active');

    // 6. Change id from INTEGER to UUID
    // This is complex and requires data migration, so we'll keep INTEGER for now
    // If you need UUID, you'd need to:
    // - Create new column with UUID
    // - Copy data with generated UUIDs
    // - Update foreign keys
    // - Drop old column
    // - Rename new column

    // 7. Add unique constraint on slug after we populate it
    // This will be done after seeding
  },

  async down(queryInterface, Sequelize) {
    // Revert changes
    await queryInterface.renameColumn('membership_plans', 'is_active', 'active');
    await queryInterface.renameColumn('membership_plans', 'interval', 'billing_period');
    await queryInterface.removeColumn('membership_plans', 'stripe_price_id');
    await queryInterface.removeColumn('membership_plans', 'currency');
    await queryInterface.removeColumn('membership_plans', 'slug');
  },
};
