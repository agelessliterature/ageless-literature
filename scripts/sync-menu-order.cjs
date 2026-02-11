#!/usr/bin/env node

/**
 * Sync Menu Order from PROD WordPress → DEV V2 PostgreSQL
 *
 * SAFETY: PROD is READ-ONLY. Only SELECT queries run against PROD.
 * All writes happen exclusively on DEV V2 PostgreSQL.
 *
 * Matching strategy (in priority order):
 *   1. wp_post_id (most reliable — direct WordPress ID reference)
 *   2. Title match (last resort, logs collisions)
 *
 * Usage:
 *   node scripts/sync-menu-order.cjs                     # Full sync from PROD
 *   node scripts/sync-menu-order.cjs --from-file FILE    # Use previously exported TSV
 *   node scripts/sync-menu-order.cjs --dry-run            # Preview only, no writes
 *   node scripts/sync-menu-order.cjs --report-only        # Just generate diff report
 */

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ─── Configuration ───────────────────────────────────────────────────────

const PROD_SSH_KEY = '~/.ssh/Ageless-Literature-VM_key.pem';
const PROD_SSH_HOST = 'agelessliterature@4.150.186.139';
const PROD_WP_PATH = '/var/www/wordpress';

const DEV_SSH_KEY = '~/.ssh/dev-VM-key.pem';
const DEV_SSH_HOST = 'AgelessLiteratureDev@20.118.237.147';
const DEV_DB_CONTAINER = 'ageless-dev-postgres';
const DEV_DB_NAME = 'ageless_literature_dev';

const REPORT_DIR = path.join(__dirname, '..', 'reports', 'menu-order-sync');

// ─── Parse CLI args ──────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const REPORT_ONLY = args.includes('--report-only');
const fromFileIdx = args.indexOf('--from-file');
const FROM_FILE = fromFileIdx !== -1 ? args[fromFileIdx + 1] : null;

// ─── Helpers ─────────────────────────────────────────────────────────────

function log(msg) { console.log(msg); }
function warn(msg) { console.warn(`⚠️  ${msg}`); }
function err(msg) { console.error(`❌ ${msg}`); }

function sshExec(key, host, cmd, { timeout = 120000, label = '' } = {}) {
  try {
    const fullCmd = `ssh -o ConnectTimeout=15 -o ServerAliveInterval=5 -i ${key} ${host} '${cmd.replace(/'/g, "'\"'\"'")}'`;
    return execSync(fullCmd, { encoding: 'utf-8', timeout, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (e) {
    err(`[${label}] SSH command failed: ${e.message}`);
    throw e;
  }
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ─── Step 1: Read PROD menu_order (READ-ONLY) ───────────────────────────

function fetchProdMenuOrders() {
  if (FROM_FILE) {
    log(`📄 Reading PROD data from file: ${FROM_FILE}`);
    const content = fs.readFileSync(FROM_FILE, 'utf-8');
    return parseTsv(content);
  }

  log('\n📖 Step 1: Fetching menu_order from PROD WordPress (READ-ONLY)...');
  log('   PROD READ-ONLY CHECK: SELECT-only query via wp db query');

  const query = "SELECT p.ID, p.post_title, p.menu_order, IFNULL(pm.meta_value, '') as sku FROM wp_posts p LEFT JOIN wp_postmeta pm ON p.ID = pm.post_id AND pm.meta_key = '_sku' WHERE p.post_type = 'product' AND p.post_status = 'publish' ORDER BY p.menu_order ASC";

  const cmd = `wp --path=${PROD_WP_PATH} db query '${query}' --allow-root 2>/dev/null`;
  const output = sshExec(PROD_SSH_KEY, PROD_SSH_HOST, cmd, { timeout: 120000, label: 'PROD-READ' });

  // Save the raw export for future use
  ensureDir(REPORT_DIR);
  const exportPath = path.join(REPORT_DIR, `prod-export-${new Date().toISOString().slice(0, 10)}.tsv`);
  fs.writeFileSync(exportPath, output);
  log(`   💾 Raw export saved: ${exportPath}`);

  return parseTsv(output);
}

function parseTsv(content) {
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length < 2) {
    err('No data found in PROD export');
    process.exit(1);
  }

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split('\t');
    if (parts.length < 3) continue;
    records.push({
      wp_post_id: parseInt(parts[0]),
      title: parts[1] || '',
      menu_order: parseInt(parts[2]) || 0,
      sku: (parts[3] || '').trim(),
    });
  }

  log(`   ✅ Parsed ${records.length} PROD products with menu_order`);
  log(`   📊 Menu order range: ${Math.min(...records.map(r => r.menu_order))} – ${Math.max(...records.map(r => r.menu_order))}`);
  log(`   📊 Products with SKU: ${records.filter(r => r.sku).length}`);

  return records;
}

// ─── Step 2: Read DEV V2 books for matching ──────────────────────────────

function fetchDevBooks() {
  log('\n📖 Step 2: Fetching DEV V2 books for matching...');

  const cmd = `docker exec ${DEV_DB_CONTAINER} psql -U postgres -d ${DEV_DB_NAME} -t -A -F '|' -c "SELECT id, wp_post_id, title, menu_order FROM books WHERE status = 'published' ORDER BY id"`;
  const output = sshExec(DEV_SSH_KEY, DEV_SSH_HOST, cmd, { label: 'DEV-READ' });

  const books = output.split('\n').filter(l => l.trim()).map(line => {
    const parts = line.split('|');
    return {
      id: parseInt(parts[0]),
      wp_post_id: parts[1] ? parseInt(parts[1]) : null,
      title: parts[2] || '',
      menu_order: parseInt(parts[3]) || 0,
    };
  });

  log(`   ✅ Found ${books.length} DEV V2 books`);
  log(`   📊 With wp_post_id: ${books.filter(b => b.wp_post_id).length}`);
  log(`   📊 Current non-zero menu_order: ${books.filter(b => b.menu_order !== 0).length}`);

  return books;
}

// ─── Step 3: Match & compute diff ────────────────────────────────────────

function computeSync(prodRecords, devBooks) {
  log('\n🔄 Step 3: Matching PROD → DEV records...');

  const devByWpId = new Map();
  const devByTitle = new Map();

  for (const book of devBooks) {
    if (book.wp_post_id) devByWpId.set(book.wp_post_id, book);

    const titleKey = book.title.toLowerCase().trim();
    if (!devByTitle.has(titleKey)) {
      devByTitle.set(titleKey, [book]);
    } else {
      devByTitle.get(titleKey).push(book);
    }
  }

  const matched = [];
  const unmatchedProd = [];
  const titleCollisions = [];
  let matchedByWpId = 0;
  let matchedByTitle = 0;

  for (const prod of prodRecords) {
    // Priority 1: Match by wp_post_id
    const devBook = devByWpId.get(prod.wp_post_id);
    if (devBook) {
      matched.push({
        devId: devBook.id,
        wpPostId: prod.wp_post_id,
        title: prod.title,
        prodMenuOrder: prod.menu_order,
        devMenuOrder: devBook.menu_order,
        matchedBy: 'wp_post_id',
        changed: devBook.menu_order !== prod.menu_order,
      });
      matchedByWpId++;
      continue;
    }

    // Priority 2: Match by title (last resort)
    const titleKey = prod.title.toLowerCase().trim();
    const titleMatches = devByTitle.get(titleKey);
    if (titleMatches && titleMatches.length === 1) {
      matched.push({
        devId: titleMatches[0].id,
        wpPostId: prod.wp_post_id,
        title: prod.title,
        prodMenuOrder: prod.menu_order,
        devMenuOrder: titleMatches[0].menu_order,
        matchedBy: 'title',
        changed: titleMatches[0].menu_order !== prod.menu_order,
      });
      matchedByTitle++;
      continue;
    }

    if (titleMatches && titleMatches.length > 1) {
      titleCollisions.push({ prod, devMatches: titleMatches.length });
    }

    unmatchedProd.push(prod);
  }

  const matchedDevIds = new Set(matched.map(m => m.devId));
  const unmatchedDev = devBooks.filter(b => !matchedDevIds.has(b.id));
  const needsUpdate = matched.filter(m => m.changed);

  log(`   ✅ Matched: ${matched.length} / ${prodRecords.length} PROD products`);
  log(`      - By wp_post_id: ${matchedByWpId}`);
  log(`      - By title: ${matchedByTitle}`);
  log(`   📊 Need update: ${needsUpdate.length}`);
  log(`   ⚠️  Unmatched PROD: ${unmatchedProd.length}`);
  log(`   ⚠️  Unmatched DEV: ${unmatchedDev.length}`);
  log(`   ⚠️  Title collisions: ${titleCollisions.length}`);

  return { matched, needsUpdate, unmatchedProd, unmatchedDev, titleCollisions };
}

// ─── Step 4: Apply updates to DEV V2 ────────────────────────────────────

function applyUpdates(needsUpdate) {
  if (DRY_RUN || REPORT_ONLY) {
    log(`\n⏭️  Step 4: Skipped (${DRY_RUN ? 'dry-run' : 'report-only'} mode)`);
    return;
  }

  log(`\n📝 Step 4: Applying ${needsUpdate.length} menu_order updates to DEV V2...`);

  if (needsUpdate.length === 0) {
    log('   ✅ No updates needed — DEV is already in sync!');
    return;
  }

  const BATCH_SIZE = 500;
  let totalUpdated = 0;

  for (let i = 0; i < needsUpdate.length; i += BATCH_SIZE) {
    const batch = needsUpdate.slice(i, i + BATCH_SIZE);
    const cases = batch.map(m => `WHEN ${m.devId} THEN ${m.prodMenuOrder}`).join(' ');
    const ids = batch.map(m => m.devId).join(',');

    const sql = `UPDATE books SET menu_order = CASE id ${cases} END WHERE id IN (${ids})`;

    sshExec(DEV_SSH_KEY, DEV_SSH_HOST,
      `docker exec ${DEV_DB_CONTAINER} psql -U postgres -d ${DEV_DB_NAME} -c '${sql}'`,
      { label: `DEV-WRITE batch ${Math.floor(i / BATCH_SIZE) + 1}` }
    );

    totalUpdated += batch.length;
    const pct = Math.round((totalUpdated / needsUpdate.length) * 100);
    log(`   📦 Batch ${Math.floor(i / BATCH_SIZE) + 1}: Updated ${batch.length} books (${pct}%)`);
  }

  log(`   ✅ Updated ${totalUpdated} books total`);
}

// ─── Step 5: Generate report ─────────────────────────────────────────────

function generateReport(result, prodRecords, devBooks) {
  log('\n📊 Step 5: Generating sync report...');

  ensureDir(REPORT_DIR);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  const report = {
    timestamp: new Date().toISOString(),
    dryRun: DRY_RUN,
    summary: {
      prodTotal: prodRecords.length,
      devTotal: devBooks.length,
      matched: result.matched.length,
      needsUpdate: result.needsUpdate.length,
      unmatchedProd: result.unmatchedProd.length,
      unmatchedDev: result.unmatchedDev.length,
      titleCollisions: result.titleCollisions.length,
    },
    top50Mismatches: result.needsUpdate.slice(0, 50).map(m => ({
      devId: m.devId,
      wpPostId: m.wpPostId,
      title: m.title.substring(0, 80),
      before: m.devMenuOrder,
      after: m.prodMenuOrder,
      matchedBy: m.matchedBy,
    })),
    unmatchedProd: result.unmatchedProd.slice(0, 100).map(p => ({
      wpPostId: p.wp_post_id,
      title: p.title.substring(0, 80),
      menuOrder: p.menu_order,
    })),
    unmatchedDev: result.unmatchedDev.slice(0, 100).map(d => ({
      devId: d.id,
      title: d.title.substring(0, 80),
      wpPostId: d.wp_post_id,
    })),
    titleCollisions: result.titleCollisions.map(c => ({
      title: c.prod.title.substring(0, 80),
      wpPostId: c.prod.wp_post_id,
      devMatchCount: c.devMatches,
    })),
  };

  const jsonPath = path.join(REPORT_DIR, `sync-report-${timestamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  log(`   💾 JSON report: ${jsonPath}`);

  const csvLines = ['dev_id,wp_post_id,title,before_menu_order,after_menu_order,matched_by,changed'];
  for (const m of result.matched) {
    const title = m.title.replace(/"/g, '""').substring(0, 100);
    csvLines.push(`${m.devId},${m.wpPostId},"${title}",${m.devMenuOrder},${m.prodMenuOrder},${m.matchedBy},${m.changed}`);
  }
  const csvPath = path.join(REPORT_DIR, `sync-report-${timestamp}.csv`);
  fs.writeFileSync(csvPath, csvLines.join('\n'));
  log(`   💾 CSV report: ${csvPath}`);

  log('\n' + '═'.repeat(60));
  log('  MENU ORDER SYNC REPORT');
  log('═'.repeat(60));
  log(`  PROD products:       ${report.summary.prodTotal.toLocaleString()}`);
  log(`  DEV books:           ${report.summary.devTotal.toLocaleString()}`);
  log(`  Matched:             ${report.summary.matched.toLocaleString()}`);
  log(`  Updates applied:     ${report.summary.needsUpdate.toLocaleString()}`);
  log(`  Unmatched (PROD):    ${report.summary.unmatchedProd.toLocaleString()}`);
  log(`  Unmatched (DEV):     ${report.summary.unmatchedDev.toLocaleString()}`);
  log(`  Title collisions:    ${report.summary.titleCollisions}`);
  log('═'.repeat(60));

  if (report.top50Mismatches.length > 0) {
    log('\n  Top 10 changes (before → after):');
    for (const m of report.top50Mismatches.slice(0, 10)) {
      log(`    [${m.devId}] ${m.title.substring(0, 50)}... : ${m.before} → ${m.after} (${m.matchedBy})`);
    }
  }

  return report;
}

// ─── Step 6: Verify ──────────────────────────────────────────────────────

function verify(prodRecords) {
  if (DRY_RUN || REPORT_ONLY) return;

  log('\n🔍 Step 6: Verification — random sample of 50 books...');

  const sample = prodRecords.sort(() => Math.random() - 0.5).slice(0, 50);
  const wpIds = sample.map(s => s.wp_post_id).join(',');

  const output = sshExec(DEV_SSH_KEY, DEV_SSH_HOST,
    `docker exec ${DEV_DB_CONTAINER} psql -U postgres -d ${DEV_DB_NAME} -t -A -F '|' -c 'SELECT wp_post_id, menu_order FROM books WHERE wp_post_id IN (${wpIds})'`,
    { label: 'DEV-VERIFY' }
  );

  const devMap = new Map();
  for (const line of output.split('\n').filter(l => l.trim())) {
    const [wpId, mo] = line.split('|');
    devMap.set(parseInt(wpId), parseInt(mo));
  }

  let matches = 0;
  let mismatches = 0;
  for (const s of sample) {
    const devMo = devMap.get(s.wp_post_id);
    if (devMo === s.menu_order) {
      matches++;
    } else if (devMo !== undefined) {
      mismatches++;
      if (mismatches <= 5) log(`   ❌ wp_post_id=${s.wp_post_id}: PROD=${s.menu_order}, DEV=${devMo}`);
    }
  }

  log(`   ✅ Verification: ${matches}/${matches + mismatches} match (${mismatches} mismatches)`);
}

// ─── Main ────────────────────────────────────────────────────────────────

function main() {
  log('╔══════════════════════════════════════════════════════════╗');
  log('║  Menu Order Sync: PROD WordPress → DEV V2 PostgreSQL   ║');
  log('╚══════════════════════════════════════════════════════════╝');
  if (DRY_RUN) log('🔒 DRY RUN MODE — no writes will be made\n');
  if (REPORT_ONLY) log('📊 REPORT ONLY MODE — no writes will be made\n');

  try {
    const prodRecords = fetchProdMenuOrders();
    const devBooks = fetchDevBooks();
    const result = computeSync(prodRecords, devBooks);
    applyUpdates(result.needsUpdate);
    generateReport(result, prodRecords, devBooks);
    verify(prodRecords);

    log('\n✅ Menu order sync complete!\n');
  } catch (e) {
    err(`Sync failed: ${e.message}`);
    process.exit(1);
  }
}

main();
