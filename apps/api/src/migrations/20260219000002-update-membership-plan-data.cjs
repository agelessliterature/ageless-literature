/* eslint-disable no-unused-vars */
'use strict';

/**
 * Data Migration: Update Membership Plans
 * 
 * This migration updates existing membership plan details.
 * Update the planUpdates object below with your desired changes.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Delete existing plans and insert new ones with correct slugs
    await queryInterface.bulkDelete('membership_plans', null, {});

    // Insert new plans
    await queryInterface.bulkInsert('membership_plans', [
      {
        name: 'Silver',
        slug: 'silver',
        description: 'For less than 64¢ per day',
        price: 19.99,
        currency: 'USD',
        interval: 'monthly',
        stripe_price_id: null,
        features: JSON.stringify([
          'Exclusive master class on book collecting from experts with 25+ years experience. 45+ Min long.',
          'Unlimited Private Rare Book Requests',
          'Access "My Collection" and display your collection digitally',
          'Unlimited Private Offer Submissions',
          'Unlimited Social Posting',
        ]),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'Gold',
        slug: 'gold',
        description: 'For less than $2 per day',
        price: 49.99,
        currency: 'USD',
        interval: 'monthly',
        stripe_price_id: null,
        features: JSON.stringify([
          'SAVE 67% ON ALL AUCTION FEES',
          '24 hour early access to auctions',
          'Exclusive master class on book collecting from experts with 25+ years experience. 45+ Min long.',
          'Unlimited Private Rare Book Requests',
          'Access "My Collection" and display your collection digitally',
          'Unlimited Private Offer Submissions',
          'Unlimited Social Posting',
          'Unlimited access to our AI Rare Book Research Tool',
          '20% OFF 3 AI Authentications /Month',
          'Access to value charts and data of the appreciation of collectible books',
        ]),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'Platinum',
        slug: 'platinum',
        description: 'For less than $13 per day',
        price: 400.00,
        currency: 'USD',
        interval: 'monthly',
        stripe_price_id: null,
        features: JSON.stringify([
          'RECEIVE EVERY BENEFIT OF A GOLD MEMBERSHIP',
          'Concierge Service - One-on-one guidance with an expert bookseller who shares your passion',
          'Help you craft the library you\'ve always dreamed of',
          'With AL\'s Platinum Service, you will never pay fees when working directly with your paired bookseller',
          'As your collection grows, you are free to request a new bookseller anytime—at no cost',
        ]),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    console.log('✅ Membership plans updated successfully');
  },

  async down(queryInterface, Sequelize) {
    // Revert to previous values if needed
    // Note: This is a data migration, so rollback should restore original values
    console.log('⚠️  Rollback for data migrations should be done carefully');
    console.log('    Consider restoring from backup if needed');
  },
};
