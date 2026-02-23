/**
 * Seed Membership Plans
 * Creates default membership plans in the database
 */

import db from '../models/index.js';
const { MembershipPlan } = db;

const membershipPlans = [
  {
    name: 'Silver',
    slug: 'silver',
    description: 'For less than 64¢ per day',
    price: 19.99,
    currency: 'USD',
    interval: 'monthly',
    features: [
      'Exclusive master class on book collecting from experts with 25+ years experience. 45+ Min long.',
      'Unlimited Private Rare Book Requests',
      'Access "My Collection" and display your collection digitally',
      'Unlimited Private Offer Submissions',
      'Unlimited Social Posting',
    ],
    isActive: true,
  },
  {
    name: 'Gold',
    slug: 'gold',
    description: 'For less than $2 per day',
    price: 49.99,
    currency: 'USD',
    interval: 'monthly',
    features: [
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
    ],
    isActive: true,
  },
  {
    name: 'Platinum',
    slug: 'platinum',
    description: 'For less than $13 per day',
    price: 400.0,
    currency: 'USD',
    interval: 'monthly',
    features: [
      'RECEIVE EVERY BENEFIT OF A GOLD MEMBERSHIP',
      'Concierge Service - One-on-one guidance with an expert bookseller who shares your passion',
      "Help you craft the library you've always dreamed of",
      "With AL's Platinum Service, you will never pay fees when working directly with your paired bookseller",
      'As your collection grows, you are free to request a new bookseller anytime—at no cost',
    ],
    isActive: true,
  },
];

async function seedMembershipPlans() {
  try {
    console.log('🌱 Starting membership plans seeding...');

    // Check if plans already exist
    const existingPlans = await MembershipPlan.findAll();

    if (existingPlans.length > 0) {
      console.log(`⚠️  Found ${existingPlans.length} existing plans. Options:`);
      console.log('   1. Run with --force flag to delete and recreate');
      console.log('   2. Manually delete plans from database');

      if (!process.argv.includes('--force')) {
        console.log('\n✋ Skipping seed to avoid duplicates');
        process.exit(0);
      }

      console.log('🗑️  Deleting existing plans...');
      await MembershipPlan.destroy({ where: {}, truncate: true });
    }

    // Create plans
    console.log(`📝 Creating ${membershipPlans.length} membership plans...`);

    for (const planData of membershipPlans) {
      const plan = await MembershipPlan.create(planData);
      console.log(`   ✅ Created: ${plan.name} ($${plan.price}/${plan.interval})`);
    }

    console.log('\n✨ Membership plans seeded successfully!');
    console.log('\nCreated plans:');

    const allPlans = await MembershipPlan.findAll({ order: [['price', 'ASC']] });
    allPlans.forEach((plan) => {
      console.log(`   - ${plan.name} (${plan.slug}): $${plan.price}/${plan.interval}`);
      console.log(`     Features: ${plan.features.length} items`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run seeder
seedMembershipPlans();
