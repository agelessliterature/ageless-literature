/**
 * Migration: Create Base Tables
 * Creates all core tables for the application with INTEGER IDs
 * This migration must run FIRST before all others
 * Created: Nov 1, 2025
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create users table
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      hash: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      first_name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      last_name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      phone_number: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      role: {
        type: Sequelize.ENUM('admin', 'vendor', 'customer'),
        defaultValue: 'customer',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('users', ['email']);
    await queryInterface.addIndex('users', ['role']);

    // 2. Create vendors table
    await queryInterface.createTable('vendors', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      shop_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      shop_url: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      logo: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      phone_number: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      approved: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('vendors', ['user_id']);

    // 3. Create categories table
    await queryInterface.createTable('categories', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      slug: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('categories', ['slug']);

    // 4. Create tags table
    await queryInterface.createTable('tags', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      slug: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('tags', ['slug']);

    // 5. Create collections table
    await queryInterface.createTable('collections', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      slug: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      image: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // 6. Create books table
    await queryInterface.createTable('books', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      author: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      isbn: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      publication_year: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      publisher: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      condition: {
        type: Sequelize.ENUM('new', 'like_new', 'very_good', 'good', 'acceptable', 'poor'),
        allowNull: false,
      },
      description: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      quantity: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
      },
      image: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('books', ['title']);
    await queryInterface.addIndex('books', ['author']);
    await queryInterface.addIndex('books', ['isbn']);

    // 7. Create book_categories junction table
    await queryInterface.createTable('book_categories', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      book_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'books', key: 'id' },
        onDelete: 'CASCADE',
      },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'categories', key: 'id' },
        onDelete: 'CASCADE',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('book_categories', ['book_id']);
    await queryInterface.addIndex('book_categories', ['category_id']);
    await queryInterface.addIndex('book_categories', ['book_id', 'category_id'], { unique: true });

    // 8. Create book_tags junction table
    await queryInterface.createTable('book_tags', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      book_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'books', key: 'id' },
        onDelete: 'CASCADE',
      },
      tag_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'tags', key: 'id' },
        onDelete: 'CASCADE',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('book_tags', ['book_id']);
    await queryInterface.addIndex('book_tags', ['tag_id']);
    await queryInterface.addIndex('book_tags', ['book_id', 'tag_id'], { unique: true });

    // 9. Create book_collections junction table
    await queryInterface.createTable('book_collections', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      book_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'books', key: 'id' },
        onDelete: 'CASCADE',
      },
      collection_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'collections', key: 'id' },
        onDelete: 'CASCADE',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('book_collections', ['book_id']);
    await queryInterface.addIndex('book_collections', ['collection_id']);

    // 10. Create orders table
    await queryInterface.createTable('orders', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      total: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled'),
        defaultValue: 'pending',
      },
      payment_status: {
        type: Sequelize.ENUM('pending', 'paid', 'failed', 'refunded'),
        defaultValue: 'pending',
      },
      payment_method: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      stripe_payment_intent_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      shipping_address: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('orders', ['user_id']);
    await queryInterface.addIndex('orders', ['status']);

    // 11. Create order_items table
    await queryInterface.createTable('order_items', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      order_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'orders', key: 'id' },
        onDelete: 'CASCADE',
      },
      book_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'books', key: 'id' },
        onDelete: 'SET NULL',
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('order_items', ['order_id']);
    await queryInterface.addIndex('order_items', ['book_id']);

    // 12. Create carts table
    await queryInterface.createTable('carts', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('carts', ['user_id']);

    // 13. Create cart_items table
    await queryInterface.createTable('cart_items', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      cart_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'carts', key: 'id' },
        onDelete: 'CASCADE',
      },
      book_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'books', key: 'id' },
        onDelete: 'CASCADE',
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('cart_items', ['cart_id']);
    await queryInterface.addIndex('cart_items', ['book_id']);

    // 14. Create wishlists table
    await queryInterface.createTable('wishlists', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('wishlists', ['user_id']);

    // 15. Create wishlist_items table
    await queryInterface.createTable('wishlist_items', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      wishlist_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'wishlists', key: 'id' },
        onDelete: 'CASCADE',
      },
      book_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'books', key: 'id' },
        onDelete: 'CASCADE',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('wishlist_items', ['wishlist_id']);
    await queryInterface.addIndex('wishlist_items', ['book_id']);

    // 16. Create reservations table
    await queryInterface.createTable('reservations', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      book_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'books', key: 'id' },
        onDelete: 'CASCADE',
      },
      status: {
        type: Sequelize.ENUM('pending', 'confirmed', 'cancelled', 'expired'),
        defaultValue: 'pending',
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('reservations', ['user_id']);
    await queryInterface.addIndex('reservations', ['book_id']);
    await queryInterface.addIndex('reservations', ['status']);

    // 17. Create conversations table
    await queryInterface.createTable('conversations', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      user1_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      user2_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('conversations', ['user1_id']);
    await queryInterface.addIndex('conversations', ['user2_id']);
    await queryInterface.addIndex('conversations', ['user1_id', 'user2_id'], { unique: true });

    // 18. Create messages table
    await queryInterface.createTable('messages', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      conversation_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'conversations', key: 'id' },
        onDelete: 'CASCADE',
      },
      sender_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      read: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('messages', ['conversation_id']);
    await queryInterface.addIndex('messages', ['sender_id']);

    // 19. Create notifications table
    await queryInterface.createTable('notifications', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      read: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      data: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('notifications', ['user_id']);
    await queryInterface.addIndex('notifications', ['read']);

    // 20. Create membership_plans table
    await queryInterface.createTable('membership_plans', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      billing_period: {
        type: Sequelize.ENUM('monthly', 'yearly'),
        allowNull: false,
      },
      features: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // 21. Create membership_subscriptions table
    await queryInterface.createTable('membership_subscriptions', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      plan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'membership_plans', key: 'id' },
        onDelete: 'CASCADE',
      },
      status: {
        type: Sequelize.ENUM('active', 'cancelled', 'expired'),
        defaultValue: 'active',
      },
      start_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      end_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      stripe_subscription_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('membership_subscriptions', ['user_id']);
    await queryInterface.addIndex('membership_subscriptions', ['plan_id']);
    await queryInterface.addIndex('membership_subscriptions', ['status']);

    // 22. Create membership_invoices table
    await queryInterface.createTable('membership_invoices', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      subscription_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'membership_subscriptions', key: 'id' },
        onDelete: 'CASCADE',
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('pending', 'paid', 'failed'),
        defaultValue: 'pending',
      },
      stripe_invoice_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      due_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      paid_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('membership_invoices', ['subscription_id']);
    await queryInterface.addIndex('membership_invoices', ['status']);

    // 23. Create collector_profiles table
    await queryInterface.createTable('collector_profiles', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      bio: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      interests: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('collector_profiles', ['user_id']);

    // 24. Create glossary_terms table
    await queryInterface.createTable('glossary_terms', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      term: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      definition: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      category: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('glossary_terms', ['term']);

    // 25. Create email_templates table
    await queryInterface.createTable('email_templates', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      subject: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      body: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      variables: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // 26. Create vendor_payout_settings table
    await queryInterface.createTable('vendor_payout_settings', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      vendor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'vendors', key: 'id' },
        onDelete: 'CASCADE',
      },
      method: {
        type: Sequelize.ENUM('stripe', 'paypal', 'ach'),
        allowNull: false,
      },
      details: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('vendor_payout_settings', ['vendor_id']);

    // 27. Create vendor_withdrawals table
    await queryInterface.createTable('vendor_withdrawals', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      vendor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'vendors', key: 'id' },
        onDelete: 'CASCADE',
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed'),
        defaultValue: 'pending',
      },
      method: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('vendor_withdrawals', ['vendor_id']);
    await queryInterface.addIndex('vendor_withdrawals', ['status']);

    console.log('✅ Base tables created successfully');
  },

  down: async (queryInterface, Sequelize) => {
    // Drop tables in reverse order (respecting foreign key constraints)
    await queryInterface.dropTable('vendor_withdrawals');
    await queryInterface.dropTable('vendor_payout_settings');
    await queryInterface.dropTable('email_templates');
    await queryInterface.dropTable('glossary_terms');
    await queryInterface.dropTable('collector_profiles');
    await queryInterface.dropTable('membership_invoices');
    await queryInterface.dropTable('membership_subscriptions');
    await queryInterface.dropTable('membership_plans');
    await queryInterface.dropTable('notifications');
    await queryInterface.dropTable('messages');
    await queryInterface.dropTable('conversations');
    await queryInterface.dropTable('reservations');
    await queryInterface.dropTable('wishlist_items');
    await queryInterface.dropTable('wishlists');
    await queryInterface.dropTable('cart_items');
    await queryInterface.dropTable('carts');
    await queryInterface.dropTable('order_items');
    await queryInterface.dropTable('orders');
    await queryInterface.dropTable('book_collections');
    await queryInterface.dropTable('book_tags');
    await queryInterface.dropTable('book_categories');
    await queryInterface.dropTable('books');
    await queryInterface.dropTable('collections');
    await queryInterface.dropTable('tags');
    await queryInterface.dropTable('categories');
    await queryInterface.dropTable('vendors');
    await queryInterface.dropTable('users');

    // Drop ENUMs
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_role"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_books_condition"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_orders_status"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_orders_payment_status"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_reservations_status"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_membership_plans_billing_period"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_membership_subscriptions_status"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_membership_invoices_status"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_vendor_payout_settings_method"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_vendor_withdrawals_status"');

    console.log('✅ Base tables dropped successfully');
  },
};