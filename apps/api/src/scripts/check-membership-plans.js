/**
 * Check Membership Plans
 * Quick script to see what's in the database
 */

import db from '../models/index.js';
const { MembershipPlan } = db;

async function checkPlans() {
  try {
    console.log('📋 Current membership plans in database:\n');

    const plans = await MembershipPlan.findAll({ order: [['price', 'ASC']] });

    plans.forEach((plan, idx) => {
      console.log(`${idx + 1}. ${plan.name} (${plan.slug})`);
      console.log(`   Price: $${plan.price}/month`);
      console.log(`   Description: ${plan.description}`);
      console.log(`   Features: ${plan.features.length} items`);
      console.log('');
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkPlans();
