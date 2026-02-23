/**
 * Check Vendors
 * Quick script to see what vendors exist in the database
 */

import db from '../models/index.js';
const { Vendor, User } = db;

async function checkVendors() {
  try {
    console.log('📋 Current vendors in database:\n');

    const vendors = await Vendor.findAll({
      include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] }],
      order: [['createdAt', 'DESC']],
    });

    if (vendors.length === 0) {
      console.log('⚠️  No vendors found in database!');
      console.log('   You may need to create vendors through the admin panel or seed data.\n');
    } else {
      vendors.forEach((vendor, idx) => {
        console.log(`${idx + 1}. ${vendor.shopName} (${vendor.shopUrl})`);
        console.log(
          `   Owner: ${vendor.user?.firstName || ''} ${vendor.user?.lastName || ''} (${vendor.user?.email})`,
        );
        console.log(`   Featured: ${vendor.isFeatured ? 'Yes' : 'No'}`);
        console.log(`   Status: ${vendor.isApproved ? 'Approved' : 'Pending'}`);
        console.log('');
      });
      console.log(`Total: ${vendors.length} vendor(s)`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkVendors();
