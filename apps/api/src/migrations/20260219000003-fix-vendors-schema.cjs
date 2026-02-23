/* eslint-disable no-unused-vars */
'use strict';

/**
 * Migration: Fix Vendors Table Schema
 * 
 * Aligns the vendors table with the Vendor model
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Get current table structure
    const tableInfo = await queryInterface.describeTable('vendors');
    
    // 1. Rename description to business_description if description exists
    if (tableInfo.description && !tableInfo.business_description) {
      await queryInterface.renameColumn('vendors', 'description', 'business_description');
    } else if (!tableInfo.business_description) {
      // If neither exists, add business_description
      await queryInterface.addColumn('vendors', 'business_description', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Vendor business description and details',
      });
    }

    // 2. Add missing columns if they don't exist
    if (!tableInfo.website_url) {
      await queryInterface.addColumn('vendors', 'website_url', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    if (!tableInfo.commission_rate) {
      await queryInterface.addColumn('vendors', 'commission_rate', {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 8.00,
        comment: 'Commission percentage (default 8%)',
      });
    }

    if (!tableInfo.balance_available) {
      await queryInterface.addColumn('vendors', 'balance_available', {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0.00,
      });
    }

    if (!tableInfo.balance_pending) {
      await queryInterface.addColumn('vendors', 'balance_pending', {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0.00,
      });
    }

    if (!tableInfo.lifetime_gross_sales) {
      await queryInterface.addColumn('vendors', 'lifetime_gross_sales', {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0.00,
      });
    }

    if (!tableInfo.lifetime_commission_taken) {
      await queryInterface.addColumn('vendors', 'lifetime_commission_taken', {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0.00,
      });
    }

    if (!tableInfo.lifetime_vendor_earnings) {
      await queryInterface.addColumn('vendors', 'lifetime_vendor_earnings', {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0.00,
      });
    }

    if (!tableInfo.status) {
      // Create the enum type first
      await queryInterface.sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE enum_vendors_status AS ENUM ('pending', 'approved', 'rejected', 'inactive');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
      
      await queryInterface.addColumn('vendors', 'status', {
        type: Sequelize.ENUM('pending', 'approved', 'rejected', 'inactive'),
        defaultValue: 'pending',
      });
    }

    if (!tableInfo.rejection_reason) {
      await queryInterface.addColumn('vendors', 'rejection_reason', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }

    if (!tableInfo.admin_notes) {
      await queryInterface.addColumn('vendors', 'admin_notes', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }

    if (!tableInfo.approved_at) {
      await queryInterface.addColumn('vendors', 'approved_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    if (!tableInfo.approved_by) {
      await queryInterface.addColumn('vendors', 'approved_by', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
      });
    }

    if (!tableInfo.menu_order) {
      await queryInterface.addColumn('vendors', 'menu_order', {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      });
    }

    if (!tableInfo.wp_vendor_id) {
      await queryInterface.addColumn('vendors', 'wp_vendor_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'WordPress vendor ID for migration tracking',
      });
    }

    // 4. Rename 'approved' to align with status enum if it still exists
    if (tableInfo.approved) {
      // Migrate data: if approved=true, set status='approved', else 'pending'
      await queryInterface.sequelize.query(`
        UPDATE vendors 
        SET status = CASE 
          WHEN approved = true THEN CAST('approved' AS enum_vendors_status)
          ELSE CAST('pending' AS enum_vendors_status)
        END
        WHERE status IS NULL OR status = CAST('pending' AS enum_vendors_status)
      `);
      
      // Remove the old approved column
      await queryInterface.removeColumn('vendors', 'approved');
    }

    console.log('✅ Vendors table schema updated successfully');
  },

  async down(queryInterface, Sequelize) {
    // Revert changes
    await queryInterface.renameColumn('vendors', 'business_description', 'description');
    
    // Add back approved column
    await queryInterface.addColumn('vendors', 'approved', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });
    
    // Migrate status back to approved
    await queryInterface.sequelize.query(`
      UPDATE vendors 
      SET approved = CASE 
        WHEN status = 'approved' THEN true 
        ELSE false 
      END
    `);

    // Remove added columns
    const columnsToRemove = [
      'website_url',
      'commission_rate',
      'balance_available',
      'balance_pending',
      'lifetime_gross_sales',
      'lifetime_commission_taken',
      'lifetime_vendor_earnings',
      'status',
      'rejection_reason',
      'admin_notes',
      'approved_at',
      'approved_by',
      'menu_order',
      'wp_vendor_id',
    ];

    for (const column of columnsToRemove) {
      const tableInfo = await queryInterface.describeTable('vendors');
      if (tableInfo[column]) {
        await queryInterface.removeColumn('vendors', column);
      }
    }
  },
};
