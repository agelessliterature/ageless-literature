/**
 * WordPress to Dev Database Vendor Migration Script
 * 
 * Migrates vendor profile data from WordPress production to dev PostgreSQL
 * - Extracts vendor profiles from WordPress Dokan plugin
 * - Resolves attachment IDs to full URLs (keeps images on WordPress)
 * - Creates/updates vendor records in PostgreSQL
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import pkg from 'pg';
const { Client } = pkg;

const execAsync = promisify(exec);

// Configuration
const WP_SSH_HOST = 'agelessliterature@4.150.186.139';
const WP_SSH_KEY = '~/.ssh/Ageless-Literature-VM_key.pem';
const WP_PATH = '/var/www/wordpress';

// PostgreSQL connection (using dev environment variables)
const PG_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'ageless_literature_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

/**
 * Execute WP-CLI command on remote WordPress server
 */
async function wpQuery(sql) {
  const escapedSql = sql.replace(/"/g, '\\"').replace(/'/g, "'\"'\"'");
  const command = `ssh -i ${WP_SSH_KEY} ${WP_SSH_HOST} "wp db query '${sql}' --path=${WP_PATH} --allow-root"`;
  
  try {
    const { stdout } = await execAsync(command);
    return stdout;
  } catch (error) {
    console.error('WordPress query error:', error.message);
    throw error;
  }
}

/**
 * Get vendor user IDs from WordPress
 */
async function getWordPressVendors() {
  console.log('Fetching vendor list from WordPress...');
  
  const sql = `SELECT ID, user_login, user_email, display_name 
               FROM wp_users 
               WHERE ID IN (
                 SELECT user_id FROM wp_usermeta 
                 WHERE meta_key = 'wp_capabilities' 
                 AND meta_value LIKE '%seller%'
               )
               ORDER BY ID`;
  
  const result = await wpQuery(sql);
  
  // Parse tab-delimited output
  const lines = result.trim().split('\n');
  const vendors = [];
  
  for (let i = 1; i < lines.length; i++) { // Skip header
    const [id, login, email, displayName] = lines[i].split('\t');
    if (id && email) {
      vendors.push({ id: parseInt(id), login, email, displayName });
    }
  }
  
  console.log(`Found ${vendors.length} vendors`);
  return vendors;
}

/**
 * Get dokan_profile_settings for a vendor
 */
async function getVendorProfile(userId) {
  const command = `ssh -i ${WP_SSH_KEY} ${WP_SSH_HOST} "wp user meta get ${userId} dokan_profile_settings --path=${WP_PATH} --allow-root 2>/dev/null"`;
  
  try {
    const { stdout } = await execAsync(command);
    // Parse PHP array output (ugly but works)
    return parsePhpArray(stdout);
  } catch (error) {
    console.warn(`Could not fetch profile for user ${userId}`);
    return null;
  }
}

/**
 * Get attachment URL from WordPress by ID
 */
async function getAttachmentUrl(attachmentId) {
  if (!attachmentId || attachmentId === '0') return null;
  
  const sql = `SELECT guid FROM wp_posts WHERE ID = ${attachmentId} AND post_type = 'attachment' LIMIT 1`;
  const result = await wpQuery(sql);
  
  const lines = result.trim().split('\n');
  if (lines.length > 1) {
    return lines[1].trim(); // Second line is the URL
  }
  return null;
}

/**
 * Parse PHP array output (basic parser for dokan_profile_settings)
 */
function parsePhpArray(phpOutput) {
  const profile = {
    store_name: null,
    vendor_biography: null,
    phone: null,
    banner: null,
    gravatar: null,
    social: {},
    address: {},
  };
  
  // Extract store_name
  const storeNameMatch = phpOutput.match(/'store_name'\s*=>\s*'([^']*)'/);
  if (storeNameMatch) profile.store_name = storeNameMatch[1];
  
  // Extract banner ID
  const bannerMatch = phpOutput.match(/'banner'\s*=>\s*(\d+)/);
  if (bannerMatch) profile.banner = parseInt(bannerMatch[1]);
  
  // Extract gravatar/profile photo ID
  const gravatarMatch = phpOutput.match(/'gravatar'\s*=>\s*(\d+)/);
  if (gravatarMatch) profile.gravatar = parseInt(gravatarMatch[1]);
  
  // Extract biography (handle escaped quotes and HTML)
  const bioMatch = phpOutput.match(/'vendor_biography'\s*=>\s*'([^']*(?:\\.[^']*)*)'/);
  if (bioMatch) {
    profile.vendor_biography = bioMatch[1]
      .replace(/\\'/g, "'")
      .replace(/\\n/g, '\n')
      .replace(/\\(.)/g, '$1');
  }
  
  // Extract phone
  const phoneMatch = phpOutput.match(/'phone'\s*=>\s*'([^']*)'/);
  if (phoneMatch) profile.phone = phoneMatch[1];
  
  // Extract social media links
  const fbMatch = phpOutput.match(/'fb'\s*=>\s*'([^']*)'/);
  if (fbMatch && fbMatch[1]) profile.social.facebook = fbMatch[1];
  
  const twitterMatch = phpOutput.match(/'twitter'\s*=>\s*'([^']*)'/);
  if (twitterMatch && twitterMatch[1]) profile.social.twitter = twitterMatch[1];
  
  const instaMatch = phpOutput.match(/'instagram'\s*=>\s*'([^']*)'/);
  if (instaMatch && instaMatch[1]) profile.social.instagram = instaMatch[1];
  
  const linkedinMatch = phpOutput.match(/'linkedin'\s*=>\s*'([^']*)'/);
  if (linkedinMatch && linkedinMatch[1]) profile.social.linkedin = linkedinMatch[1];
  
  // Extract address
  const street1Match = phpOutput.match(/'street_1'\s*=>\s*'([^']*)'/);
  if (street1Match) profile.address.street1 = street1Match[1];
  
  const cityMatch = phpOutput.match(/'city'\s*=>\s*'([^']*)'/);
  if (cityMatch) profile.address.city = cityMatch[1];
  
  const stateMatch = phpOutput.match(/'state'\s*=>\s*'([^']*)'/);
  if (stateMatch) profile.address.state = stateMatch[1];
  
  const zipMatch = phpOutput.match(/'zip'\s*=>\s*'([^']*)'/);
  if (zipMatch) profile.address.zip = zipMatch[1];
  
  const countryMatch = phpOutput.match(/'country'\s*=>\s*'([^']*)'/);
  if (countryMatch) profile.address.country = countryMatch[1];
  
  return profile;
}

/**
 * Create slug from shop name
 */
function createSlug(name, email) {
  if (name && name !== '') {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
  // Fallback to email username
  return email.split('@')[0].toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

/**
 * Find or create user in PostgreSQL
 */
async function findOrCreateUser(client, vendor) {
  const { email, displayName } = vendor;
  
  // Check if user exists
  const userResult = await client.query(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );
  
  if (userResult.rows.length > 0) {
    return userResult.rows[0].id;
  }
  
  // Create new user
  const insertResult = await client.query(
    `INSERT INTO users (email, display_name, role, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW())
     RETURNING id`,
    [email, displayName || email.split('@')[0], 'vendor']
  );
  
  console.log(`  Created user: ${email}`);
  return insertResult.rows[0].id;
}

/**
 * Upsert vendor in PostgreSQL
 */
async function upsertVendor(client, wpVendor, profile, logoUrl, bannerUrl) {
  const userId = await findOrCreateUser(client, wpVendor);
  
  const shopName = profile.store_name || wpVendor.displayName || wpVendor.login;
  const shopUrl = createSlug(shopName, wpVendor.email);
  
  // Format business description from biography
  let businessDescription = profile.vendor_biography;
  if (businessDescription) {
    // Strip HTML tags for plain text
    businessDescription = businessDescription
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();
  }
  
  // Build address string if available
  let addressParts = [];
  if (profile.address.street1) addressParts.push(profile.address.street1);
  if (profile.address.city) addressParts.push(profile.address.city);
  if (profile.address.state) addressParts.push(profile.address.state);
  if (profile.address.zip) addressParts.push(profile.address.zip);
  
  // Check if vendor already exists
  const existingVendor = await client.query(
    'SELECT id FROM vendors WHERE user_id = $1',
    [userId]
  );
  
  if (existingVendor.rows.length > 0) {
    // Update existing vendor
    await client.query(
      `UPDATE vendors 
       SET shop_name = $1,
           shop_url = $2,
           phone_number = $3,
           business_description = $4,
           logo_url = $5,
           banner_url = $6,
           social_facebook = $7,
           social_twitter = $8,
           social_instagram = $9,
           social_linkedin = $10,
           updated_at = NOW()
       WHERE user_id = $11`,
      [
        shopName,
        shopUrl,
        profile.phone || null,
        businessDescription || null,
        logoUrl,
        bannerUrl,
        profile.social.facebook || null,
        profile.social.twitter || null,
        profile.social.instagram || null,
        profile.social.linkedin || null,
        userId,
      ]
    );
    console.log(`  Updated vendor: ${shopName} (${wpVendor.email})`);
  } else {
    // Insert new vendor
    await client.query(
      `INSERT INTO vendors (
        user_id, shop_name, shop_url, phone_number, business_description,
        logo_url, banner_url, social_facebook, social_twitter, 
        social_instagram, social_linkedin, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
      [
        userId,
        shopName,
        shopUrl,
        profile.phone || null,
        businessDescription || null,
        logoUrl,
        bannerUrl,
        profile.social.facebook || null,
        profile.social.twitter || null,
        profile.social.instagram || null,
        profile.social.linkedin || null,
        'approved', // Auto-approve migrated vendors
      ]
    );
    console.log(`  Created vendor: ${shopName} (${wpVendor.email})`);
  }
}

/**
 * Main migration function
 */
async function migrateVendors() {
  console.log('=== WordPress to Dev Vendor Migration ===\n');
  
  const client = new Client(PG_CONFIG);
  await client.connect();
  console.log('Connected to PostgreSQL\n');
  
  try {
    // Get all WordPress vendors
    const wpVendors = await getWordPressVendors();
    
    let processed = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const wpVendor of wpVendors) {
      try {
        console.log(`\n[${processed + 1}/${wpVendors.length}] Processing: ${wpVendor.email}`);
        
        // Get profile data
        const profile = await getVendorProfile(wpVendor.id);
        
        if (!profile || !profile.store_name) {
          console.log(`  Skipped: No profile data or store name`);
          skipped++;
          continue;
        }
        
        // Resolve image URLs
        let logoUrl = null;
        let bannerUrl = null;
        
        if (profile.gravatar && profile.gravatar > 0) {
          logoUrl = await getAttachmentUrl(profile.gravatar);
          if (logoUrl) console.log(`  Logo: ${logoUrl}`);
        }
        
        if (profile.banner && profile.banner > 0) {
          bannerUrl = await getAttachmentUrl(profile.banner);
          if (bannerUrl) console.log(`  Banner: ${bannerUrl}`);
        }
        
        // Insert/update in PostgreSQL
        await upsertVendor(client, wpVendor, profile, logoUrl, bannerUrl);
        processed++;
        
        // Rate limit (avoid hammering WordPress server)
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`  ERROR: ${error.message}`);
        errors++;
      }
    }
    
    console.log('\n=== Migration Complete ===');
    console.log(`Processed: ${processed}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);
    
  } finally {
    await client.end();
  }
}

// Run migration
migrateVendors().catch(console.error);
