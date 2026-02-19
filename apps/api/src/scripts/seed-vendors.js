/**
 * Seed Vendors
 * Creates test vendor accounts in the database
 */

import db from '../models/index.js';
import bcrypt from 'bcrypt';

const { User, Vendor } = db;

const vendorsData = [
  {
    user: {
      firstName: 'James',
      lastName: 'Morrison',
      email: 'james.morrison@rarebooks.com',
      password: 'Password123!',
      role: 'vendor',
      isVerified: true,
    },
    vendor: {
      shopName: "Morrison's Rare Books",
      shopUrl: 'morrisons-rare-books',
      businessDescription:
        'Specializing in first editions and antiquarian books for over 30 years. Our collection includes rare American literature, signed copies, and limited editions.',
      phoneNumber: '+1-555-0101',
      websiteUrl: 'https://morrisonsrarebooks.com',
      socialFacebook: 'https://facebook.com/morrisonsrarebooks',
      socialInstagram: 'https://instagram.com/morrisonsrarebooks',
      status: 'approved',
      isFeatured: true,
      featuredPriority: 1,
      commissionRate: 8.0,
      menuOrder: 1,
    },
  },
  {
    user: {
      firstName: 'Sarah',
      lastName: 'Chen',
      email: 'sarah@classicbookshop.com',
      password: 'Password123!',
      role: 'vendor',
      isVerified: true,
    },
    vendor: {
      shopName: 'Classic Book Shop',
      shopUrl: 'classic-book-shop',
      businessDescription:
        'Curated collection of classic literature, vintage books, and collectible editions. We pride ourselves on quality authentication and expert knowledge.',
      phoneNumber: '+1-555-0102',
      websiteUrl: 'https://classicbookshop.com',
      socialTwitter: 'https://twitter.com/classicbookshop',
      socialInstagram: 'https://instagram.com/classicbookshop',
      status: 'approved',
      isFeatured: true,
      featuredPriority: 2,
      commissionRate: 8.0,
      menuOrder: 2,
    },
  },
  {
    user: {
      firstName: 'Robert',
      lastName: 'Williams',
      email: 'robert@antiquebookgallery.com',
      password: 'Password123!',
      role: 'vendor',
      isVerified: true,
    },
    vendor: {
      shopName: 'Antique Book Gallery',
      shopUrl: 'antique-book-gallery',
      businessDescription:
        'Your destination for antique books, historical manuscripts, and literary treasures. Family-owned since 1985.',
      phoneNumber: '+1-555-0103',
      websiteUrl: 'https://antiquebookgallery.com',
      socialFacebook: 'https://facebook.com/antiquebookgallery',
      socialLinkedin: 'https://linkedin.com/company/antiquebookgallery',
      status: 'approved',
      isFeatured: false,
      commissionRate: 8.0,
      menuOrder: 3,
    },
  },
  {
    user: {
      firstName: 'Emily',
      lastName: 'Thompson',
      email: 'emily@heritagebooks.com',
      password: 'Password123!',
      role: 'vendor',
      isVerified: true,
    },
    vendor: {
      shopName: 'Heritage Books & Manuscripts',
      shopUrl: 'heritage-books',
      businessDescription:
        'Specialists in heritage literature, historical documents, and rare manuscript collections. Over 40 years of expertise in authentication and preservation.',
      phoneNumber: '+1-555-0104',
      websiteUrl: 'https://heritagebooks.com',
      socialInstagram: 'https://instagram.com/heritagebooks',
      status: 'approved',
      isFeatured: true,
      featuredPriority: 3,
      commissionRate: 8.0,
      menuOrder: 4,
    },
  },
  {
    user: {
      firstName: 'Michael',
      lastName: 'Anderson',
      email: 'michael@firsteditonfinds.com',
      password: 'Password123!',
      role: 'vendor',
      isVerified: true,
    },
    vendor: {
      shopName: 'First Edition Finds',
      shopUrl: 'first-edition-finds',
      businessDescription:
        'Discover exceptional first editions and collectible books. We source rare titles from private collections and estate sales worldwide.',
      phoneNumber: '+1-555-0105',
      websiteUrl: 'https://firsteditionfinds.com',
      socialTwitter: 'https://twitter.com/firsteditionfinds',
      socialFacebook: 'https://facebook.com/firsteditionfinds',
      status: 'approved',
      isFeatured: false,
      commissionRate: 8.0,
      menuOrder: 5,
    },
  },
];

async function seedVendors() {
  try {
    console.log('🌱 Starting vendor seeding...');

    // Check if vendors already exist
    const existingVendors = await Vendor.findAll();

    if (existingVendors.length > 0) {
      console.log(`⚠️  Found ${existingVendors.length} existing vendors. Options:`);
      console.log('   1. Run with --force flag to delete and recreate');
      console.log('   2. Manually delete vendors from database');

      if (!process.argv.includes('--force')) {
        console.log('\n✋ Skipping seed to avoid duplicates');
        process.exit(0);
      }

      console.log('🗑️  Deleting existing vendors and users...');
      // Delete vendors (will cascade to users if needed)
      await Vendor.destroy({ where: {}, truncate: true });
      // Delete vendor users
      await User.destroy({ where: { role: 'vendor' } });
    }

    console.log(`📝 Creating ${vendorsData.length} vendors...`);

    for (const data of vendorsData) {
      // Hash password
      const hashedPassword = await bcrypt.hash(data.user.password, 10);

      // Create user
      const user = await User.create({
        ...data.user,
        password: hashedPassword,
      });

      // Create vendor
      const vendor = await Vendor.create({
        ...data.vendor,
        userId: user.id,
        approvedAt: new Date(),
      });

      console.log(`   ✅ Created: ${vendor.shopName} (${user.email})`);
    }

    console.log('\n✨ Vendors seeded successfully!');
    console.log('\nCreated vendors:');

    const allVendors = await Vendor.findAll({
      include: [{ model: User, as: 'user', attributes: ['email', 'firstName', 'lastName'] }],
      order: [['menuOrder', 'ASC']],
    });

    allVendors.forEach((vendor) => {
      const featured = vendor.isFeatured ? '⭐ FEATURED' : '';
      console.log(`   - ${vendor.shopName} (${vendor.shopUrl}) ${featured}`);
      console.log(`     Email: ${vendor.user.email}`);
      console.log(`     Status: ${vendor.status}`);
    });

    console.log('\n🔑 Login credentials for all vendors:');
    console.log('   Password: Password123!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run seeder
seedVendors();
