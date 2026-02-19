/**
 * Migration: Create Coupons System
 * Creates coupons table, coupon_redemptions table, and adds coupon fields to orders and carts.
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Create coupons table
      await queryInterface.createTable(
        'coupons',
        {
          id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
          },
          code: {
            type: Sequelize.STRING(50),
            allowNull: false,
            unique: true,
          },
          name: {
            type: Sequelize.STRING(255),
            allowNull: false,
          },
          description: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          discount_type: {
            type: Sequelize.ENUM('percentage', 'fixed_amount', 'free_shipping'),
            allowNull: false,
          },
          discount_value: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0,
          },
          minimum_order_amount: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
          },
          maximum_discount_amount: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
          },
          usage_limit: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          usage_count: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          per_user_limit: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 1,
          },
          starts_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          expires_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          is_active: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          vendor_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'vendors', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          scope: {
            type: Sequelize.ENUM('global', 'vendor', 'products', 'categories'),
            allowNull: false,
            defaultValue: 'global',
          },
          applies_to: {
            type: Sequelize.JSONB,
            allowNull: true,
          },
          stackable: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          created_by_type: {
            type: Sequelize.ENUM('admin', 'vendor'),
            allowNull: false,
            defaultValue: 'admin',
          },
          created_by_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          created_at: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal('NOW()'),
          },
          updated_at: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal('NOW()'),
          },
        },
        { transaction },
      );

      await queryInterface.addIndex('coupons', ['code'], {
        unique: true,
        name: 'coupons_code_unique',
        transaction,
      });
      await queryInterface.addIndex('coupons', ['vendor_id'], {
        name: 'coupons_vendor_id',
        transaction,
      });
      await queryInterface.addIndex('coupons', ['is_active', 'starts_at', 'expires_at'], {
        name: 'coupons_active_dates',
        transaction,
      });

      // 2. Create coupon_redemptions table
      await queryInterface.createTable(
        'coupon_redemptions',
        {
          id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
          },
          coupon_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'coupons', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          user_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          order_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'orders', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          discount_amount: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
          },
          created_at: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal('NOW()'),
          },
        },
        { transaction },
      );

      await queryInterface.addIndex('coupon_redemptions', ['coupon_id'], {
        name: 'coupon_redemptions_coupon_id',
        transaction,
      });
      await queryInterface.addIndex('coupon_redemptions', ['user_id'], {
        name: 'coupon_redemptions_user_id',
        transaction,
      });
      await queryInterface.addIndex('coupon_redemptions', ['order_id'], {
        name: 'coupon_redemptions_order_id',
        transaction,
      });
      await queryInterface.addIndex('coupon_redemptions', ['coupon_id', 'user_id'], {
        name: 'coupon_redemptions_coupon_user',
        transaction,
      });

      // 3. Add coupon fields to orders table
      const ordersTable = await queryInterface.describeTable('orders');

      if (!ordersTable.coupon_id) {
        await queryInterface.addColumn(
          'orders',
          'coupon_id',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'coupons', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          { transaction },
        );
      }

      if (!ordersTable.coupon_code) {
        await queryInterface.addColumn(
          'orders',
          'coupon_code',
          {
            type: Sequelize.STRING(50),
            allowNull: true,
          },
          { transaction },
        );
      }

      if (!ordersTable.discount_amount) {
        await queryInterface.addColumn(
          'orders',
          'discount_amount',
          {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0,
          },
          { transaction },
        );
      }

      // 4. Add coupon_code to carts table
      const cartsTable = await queryInterface.describeTable('carts');

      if (!cartsTable.coupon_code) {
        await queryInterface.addColumn(
          'carts',
          'coupon_code',
          {
            type: Sequelize.STRING(50),
            allowNull: true,
          },
          { transaction },
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const cartsTable = await queryInterface.describeTable('carts');
      if (cartsTable.coupon_code) {
        await queryInterface.removeColumn('carts', 'coupon_code', { transaction });
      }

      const ordersTable = await queryInterface.describeTable('orders');
      if (ordersTable.discount_amount) {
        await queryInterface.removeColumn('orders', 'discount_amount', { transaction });
      }
      if (ordersTable.coupon_code) {
        await queryInterface.removeColumn('orders', 'coupon_code', { transaction });
      }
      if (ordersTable.coupon_id) {
        await queryInterface.removeColumn('orders', 'coupon_id', { transaction });
      }

      await queryInterface.dropTable('coupon_redemptions', { transaction });
      await queryInterface.dropTable('coupons', { transaction });

      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_coupons_discount_type";', {
        transaction,
      });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_coupons_scope";', {
        transaction,
      });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_coupons_created_by_type";', {
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
