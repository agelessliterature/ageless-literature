#!/usr/bin/env node

/**
 * Migrate Auction Data from Production WordPress to Dev Database
 * - Extracts auction products and bids from WooCommerce Ultimate Auction
 * - Maps vendors by email
 * - Creates auction products and bids in dev
 * - Does NOT modify production data
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const PROD_SSH_KEY = '~/.ssh/Ageless-Literature-VM_key.pem';
const PROD_WP_SERVER = 'agelessliterature@4.150.186.139';
const DEV_SSH_KEY = '~/.ssh/dev-VM-key.pem';
const DEV_SERVER = 'AgelessLiteratureDev@20.118.237.147';

async function runProdQuery(query) {
  // Escape for shell
  const escapedQuery = query.replace(/\$/g, '\\$').replace(/`/g, '\\`').replace(/"/g, '\\"');
  const cmd = `ssh -i ${PROD_SSH_KEY} ${PROD_WP_SERVER} "cd /var/www/wordpress && wp db query \\"${escapedQuery}\\" --allow-root 2>&1"`;
  const { stdout } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });
  return stdout;
}

async function runDevQuery(query) {
  const escapedQuery = query.replace(/"/g, '\\"').replace(/'/g, "'");
  const cmd = `ssh -i ${DEV_SSH_KEY} ${DEV_SERVER} "docker exec ageless-dev-postgres psql -U postgres -d ageless_literature_dev -t -c \\"${escapedQuery}\\" 2>&1"`;
  const { stdout } = await execAsync(cmd);
  return stdout.trim();
}

async function parseTabularOutput(output) {
  const lines = output.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split('\t').map(h => h.trim());
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split('\t');
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] ? values[idx].trim() : null;
    });
    rows.push(row);
  }
  
  return rows;
}

async function getProductionAuctions() {
  console.log('📦 Fetching auction products from production WordPress...');
  
  // First get basic product info
  const query1 = "SELECT p.ID, p.post_title, p.post_author, u.user_email FROM wp_posts p JOIN wp_users u ON p.post_author = u.ID WHERE p.post_type = 'product' AND p.post_status = 'publish' AND p.ID IN (SELECT post_id FROM wp_postmeta WHERE meta_key = '_auction_dates_to')";
  
  const output1 = await runProdQuery(query1);
  const products = await parseTabularOutput(output1);
  
  // Then get metadata for each product
  const auctions = [];
  for (const product of products) {
    const query2 = `SELECT meta_key, meta_value FROM wp_postmeta WHERE post_id = ${product.ID} AND meta_key IN ('_auction_dates_from', '_auction_dates_to', '_auction_current_bid', '_auction_start_price', '_auction_bid_increment', '_auction_reserve_price', '_auction_max_current_bider', '_regular_price')`;
    
    const output2 = await runProdQuery(query2);
    const metadata = await parseTabularOutput(output2);
    
    const auctionData = {
      wp_post_id: product.ID,
      title: product.post_title,
      vendor_email: product.user_email,
      start_date: null,
      end_date: null,
      current_bid: null,
      start_price: null,
      bid_increment: null,
      reserve_price: null,
      regular_price: null
    };
    
    metadata.forEach(m => {
      const key = m.meta_key.replace('_auction_', '').replace('_', '_');
      if (m.meta_key === '_auction_dates_from') auctionData.start_date = m.meta_value;
      else if (m.meta_key === '_auction_dates_to') auctionData.end_date = m.meta_value;
      else if (m.meta_key === '_auction_current_bid') auctionData.current_bid = m.meta_value;
      else if (m.meta_key === '_auction_start_price') auctionData.start_price = m.meta_value;
      else if (m.meta_key === '_auction_bid_increment') auctionData.bid_increment = m.meta_value;
      else if (m.meta_key === '_auction_reserve_price') auctionData.reserve_price = m.meta_value;
      else if (m.meta_key === '_regular_price') auctionData.regular_price = m.meta_value;
    });
    
    auctions.push(auctionData);
  }
  
  return auctions;
}

async function getProductionBids() {
  console.log('💰 Fetching bids from production WordPress...');
  
  const query = `
    SELECT 
      l.id,
      l.userid,
      l.auction_id as wp_post_id,
      l.bid,
      l.date,
      l.proxy,
      u.user_email as bidder_email
    FROM wp_woo_ua_auction_log l
    JOIN wp_users u ON l.userid = u.ID
    ORDER BY l.date ASC
  `;
  
  const output = await runProdQuery(query);
  return await parseTabularOutput(output);
}

async function getDevVendorByEmail(email) {
  const query = `
    SELECT v.id, v.user_id, u.email 
    FROM vendors v 
    JOIN users u ON v.user_id = u.id 
    WHERE LOWER(u.email) = LOWER('${email}')
    LIMIT 1
  `;
  
  const result = await runDevQuery(query);
  if (!result || result.includes('0 rows')) return null;
  
  const match = result.match(/(\d+)\s*\|\s*(\d+)\s*\|\s*([^\s]+)/);
  if (match) {
    return {
      id: parseInt(match[1]),
      user_id: parseInt(match[2]),
      email: match[3]
    };
  }
  return null;
}

async function getDevUserByEmail(email) {
  const query = `SELECT id, email FROM users WHERE LOWER(email) = LOWER('${email}') LIMIT 1`;
  const result = await runDevQuery(query);
  
  if (!result || result.includes('0 rows')) return null;
  
  const match = result.match(/(\d+)\s*\|\s*([^\s]+)/);
  if (match) {
    return { id: parseInt(match[1]), email: match[2] };
  }
  return null;
}

async function checkBookExists(wpPostId) {
  const query = `SELECT id, wp_post_id FROM books WHERE wp_post_id = ${wpPostId} LIMIT 1`;
  const result = await runDevQuery(query);
  
  if (!result || result.includes('0 rows')) return null;
  
  const match = result.match(/(\d+)\s*\|\s*(\d+)/);
  if (match) {
    return { id: parseInt(match[1]), wp_post_id: parseInt(match[2]) };
  }
  return null;
}

async function createAuction(auction, bookId, vendorId) {
  const startDate = auction.start_date || new Date().toISOString();
  const endDate = auction.end_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const startPrice = parseFloat(auction.start_price) || 0;
  const reservePrice = auction.reserve_price ? parseFloat(auction.reserve_price) : null;
  const currentBid = auction.current_bid ? parseFloat(auction.current_bid) : null;
  
  // Determine status based on end date  
  const status = new Date(endDate) > new Date() ? 'active' : 'ended';
  
  const query = `INSERT INTO auctions (auctionable_type, auctionable_id, book_id, vendor_id, starting_bid, starting_price, reserve_price, current_bid, starts_at, ends_at, status, bid_count, created_at, updated_at) VALUES ('book', '${bookId}', ${bookId}, ${vendorId}, ${startPrice}, ${startPrice}, ${reservePrice || 'NULL'}, ${currentBid || 'NULL'}, '${startDate}'::timestamp, '${endDate}'::timestamp, '${status}', 0, NOW(), NOW()) RETURNING id`;
  
  try {
    const result = await runDevQuery(query);
    const match = result.match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
  } catch (error) {
    console.error(`Error creating auction for book ${bookId}:`, error.stderr || error.message);
    return null;
  }
}

async function createBid(auctionId, userId, amount, bidDate) {
  const query = `INSERT INTO bids (auction_id, bidder_id, amount, bid_time, is_winning, created_at, updated_at) VALUES (${auctionId}, ${userId}, ${amount}, '${bidDate}'::timestamp, false, NOW(), NOW()) RETURNING id`;
  
  try {
    const result = await runDevQuery(query);
    const match = result.match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
  } catch (error) {
    console.error(`Error creating bid:`, error.message);
    return null;
  }
}

async function updateAuctionCurrentBid(auctionId, currentBid, winningBidderId) {
  const query = `UPDATE auctions SET current_bid = ${currentBid}, winner_id = ${winningBidderId}, updated_at = NOW() WHERE id = ${auctionId}`;
  await runDevQuery(query);
}

async function migrateAuctions() {
  console.log('🚀 Starting auction migration from production to dev...\n');
  
  // Get production data
  const auctions = await getProductionAuctions();
  console.log(`✅ Found ${auctions.length} auction products in production\n`);
  
  const bids = await getProductionBids();
  console.log(`✅ Found ${bids.length} bids in production\n`);
  
  const stats = {
    auctionsCreated: 0,
    auctionsSkipped: 0,
    bidsCreated: 0,
    bidsSkipped: 0,
    errors: []
  };
  
  // Process each auction
  for (const auction of auctions) {
    console.log(`\n📌 Processing: ${auction.title} (WP ID: ${auction.wp_post_id})`);
    console.log(`   Vendor: ${auction.vendor_email}`);
    
    // Check if book exists in dev
    const existingBook = await checkBookExists(auction.wp_post_id);
    if (!existingBook) {
      console.log(`   ⚠️  Book not found in dev - skipping (needs to be synced first)`);
      stats.auctionsSkipped++;
      continue;
    }
    
    console.log(`   ✓ Book exists in dev (ID: ${existingBook.id})`);
    
    // Get vendor in dev
    const vendor = await getDevVendorByEmail(auction.vendor_email);
    if (!vendor) {
      console.log(`   ❌ Vendor not found in dev: ${auction.vendor_email}`);
      stats.errors.push(`No vendor for ${auction.vendor_email}`);
      stats.auctionsSkipped++;
      continue;
    }
    
    console.log(`   ✓ Vendor found (ID: ${vendor.id})`);
    
    // Create auction
    const auctionId = await createAuction(auction, existingBook.id, vendor.id);
    if (!auctionId) {
      console.log(`   ❌ Failed to create auction`);
      stats.auctionsSkipped++;
      continue;
    }
    
    console.log(`   ✅ Auction created (ID: ${auctionId})`);
    stats.auctionsCreated++;
    
    // Get bids for this auction
    const auctionBids = bids.filter(b => b.wp_post_id === auction.wp_post_id);
    console.log(`   📊 Processing ${auctionBids.length} bids...`);
    
    let highestBid = null;
    let winningBidderId = null;
    
    for (const bid of auctionBids) {
      const bidder = await getDevUserByEmail(bid.bidder_email);
      if (!bidder) {
        console.log(`     ⚠️  Bidder not found: ${bid.bidder_email} - skipping bid`);
        stats.bidsSkipped++;
        continue;
      }
      
      const bidAmount = parseFloat(bid.bid);
      const bidId = await createBid(auctionId, bidder.id, bidAmount, bid.date);
      
      if (bidId) {
        console.log(`     ✓ Bid created: $${bidAmount} by ${bid.bidder_email}`);
        stats.bidsCreated++;
        
        if (!highestBid || bidAmount > highestBid) {
          highestBid = bidAmount;
          winningBidderId = bidder.id;
        }
      } else {
        stats.bidsSkipped++;
      }
    }
    
    // Update auction with current bid and winning bidder
    if (highestBid && winningBidderId) {
      await updateAuctionCurrentBid(auctionId, highestBid, winningBidderId);
      console.log(`   ✅ Updated auction with current bid: $${highestBid}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Auctions created:  ${stats.auctionsCreated}`);
  console.log(`⚠️  Auctions skipped:  ${stats.auctionsSkipped}`);
  console.log(`✅ Bids created:      ${stats.bidsCreated}`);
  console.log(`⚠️  Bids skipped:      ${stats.bidsSkipped}`);
  
  if (stats.errors.length > 0) {
    console.log(`\n❌ Errors:`);
    stats.errors.forEach(err => console.log(`   - ${err}`));
  }
  
  console.log('\n✨ Migration complete!');
}

migrateAuctions().catch(console.error);
