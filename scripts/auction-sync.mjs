/**
 * auction-sync.mjs  (v2)
 * Syncs WP auctions (MySQL) → dev Postgres DB.
 * Supports both WooUA (woo_ua_auction_*) and SimpleAuctions (_auction_*) plugins.
 * Matches books via books.wp_post_id = WP product ID.
 *
 * Run: node scripts/auction-sync.mjs [--dry-run] [--update]
 *   --dry-run  : report only, no DB changes
 *   --update   : also update fields on existing auction records
 * Set DEV_DATABASE_URL env var to override default PG connection.
 */

import mysql from 'mysql2/promise';
import pg from 'pg';

const { Client } = pg;
const DRY_RUN  = process.argv.includes('--dry-run');
const DO_UPDATE = process.argv.includes('--update');

const MYSQL_CONFIG = {
  host: 'ageless-literature-wp-db.mysql.database.azure.com',
  user: 'AgelessLiterature',
  password: 'sixqYm-cybpo5-hochuj',
  database: 'ageless_literature_prod_db',
  ssl: { rejectUnauthorized: false },
};

const PG_URL =
  process.env.DEV_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/ageless_literature';

// ── Helpers ────────────────────────────────────────────────────────────────

function parseDate(str, fallback = null) {
  if (!str) return fallback;
  const d = new Date(str.includes('T') ? str : str.replace(' ', 'T') + 'Z');
  return isNaN(d.getTime()) ? fallback : d;
}

function deriveStatus(row) {
  const now     = new Date();
  const endDate = parseDate(row.end_date);
  const isClosed    = row.is_closed === '1' || row.is_closed === 1;
  const hasStarted  = row.has_started === '1' || row.has_started === 1;
  const bidCount    = parseInt(row.bid_count) || 0;

  if (!isClosed && endDate && endDate > now && hasStarted) return 'active';
  if (!isClosed && endDate && endDate > now && !hasStarted) return 'upcoming';
  // Closed or past end date
  if (bidCount > 0 && row.winner_wp_user_id && row.winner_wp_user_id !== '0') return 'ended'; // sold via WP, treated as ended in our system
  return 'ended';
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Auction Sync v2: WP MySQL → Postgres ===');
  console.log(`PG target: ${PG_URL.replace(/:[^@]+@/, ':***@')}`);
  if (DRY_RUN)  console.log('*** DRY RUN — no changes will be made ***');
  if (DO_UPDATE) console.log('*** UPDATE MODE — existing records will be refreshed ***');
  console.log('');

  // ── Connect ──────────────────────────────────────────────────────────────
  const mc = await mysql.createConnection(MYSQL_CONFIG);
  const pgClient = new Client({
    connectionString: PG_URL,
    ssl: PG_URL.includes('localhost') ? false : { rejectUnauthorized: false },
  });
  await pgClient.connect();

  // ── 1. Fetch WooUA auctions (woo_ua_auction_* meta) ──────────────────────
  const [wooUa] = await mc.execute(`
    SELECT
      p.ID          AS wp_id,
      p.post_title,
      p.post_status,
      MAX(CASE WHEN pm.meta_key = 'woo_ua_opening_price'         THEN pm.meta_value END) AS start_price,
      MAX(CASE WHEN pm.meta_key = 'woo_ua_lowest_price'          THEN pm.meta_value END) AS reserve_price,
      MAX(CASE WHEN pm.meta_key = 'woo_ua_bid_increment'         THEN pm.meta_value END) AS bid_increment,
      MAX(CASE WHEN pm.meta_key = 'woo_ua_auction_start_date'    THEN pm.meta_value END) AS start_date,
      MAX(CASE WHEN pm.meta_key = 'woo_ua_auction_end_date'      THEN pm.meta_value END) AS end_date,
      MAX(CASE WHEN pm.meta_key = 'woo_ua_auction_current_bid'   THEN pm.meta_value END) AS current_bid,
      MAX(CASE WHEN pm.meta_key = 'woo_ua_auction_bid_count'     THEN pm.meta_value END) AS bid_count,
      MAX(CASE WHEN pm.meta_key = 'woo_ua_auction_current_bider' THEN pm.meta_value END) AS winner_wp_user_id,
      MAX(CASE WHEN pm.meta_key = 'woo_ua_auction_closed'        THEN pm.meta_value END) AS is_closed,
      MAX(CASE WHEN pm.meta_key = 'woo_ua_auction_has_started'   THEN pm.meta_value END) AS has_started,
      MAX(CASE WHEN pm.meta_key = 'woo_ua_auction_type'          THEN pm.meta_value END) AS auction_type,
      MAX(CASE WHEN pm.meta_key = 'woo_ua_auction_fail_reason'   THEN pm.meta_value END) AS fail_reason,
      'woo_ua' AS plugin
    FROM wp_posts p
    JOIN wp_postmeta pm ON p.ID = pm.post_id
    WHERE p.post_type = 'product'
      AND EXISTS (
        SELECT 1 FROM wp_postmeta x
        WHERE x.post_id = p.ID AND x.meta_key = 'woo_ua_auction_start_date'
      )
    GROUP BY p.ID, p.post_title, p.post_status
    ORDER BY p.ID
  `);

  // ── 2. Fetch SimpleAuctions (_auction_* meta) ─────────────────────────────
  const [simpleAu] = await mc.execute(`
    SELECT
      p.ID          AS wp_id,
      p.post_title,
      p.post_status,
      MAX(CASE WHEN pm.meta_key = '_auction_start_price'    THEN pm.meta_value END) AS start_price,
      MAX(CASE WHEN pm.meta_key = '_auction_reserved_price' THEN pm.meta_value END) AS reserve_price,
      MAX(CASE WHEN pm.meta_key = '_auction_bid_increment'  THEN pm.meta_value END) AS bid_increment,
      MAX(CASE WHEN pm.meta_key = '_auction_dates_from'     THEN pm.meta_value END) AS start_date,
      MAX(CASE WHEN pm.meta_key = '_auction_dates_to'       THEN pm.meta_value END) AS end_date,
      MAX(CASE WHEN pm.meta_key = '_auction_current_bid'    THEN pm.meta_value END) AS current_bid,
      MAX(CASE WHEN pm.meta_key = '_auction_bid_count'      THEN pm.meta_value END) AS bid_count,
      NULL                                                                            AS winner_wp_user_id,
      MAX(CASE WHEN pm.meta_key = '_auction_closed'         THEN pm.meta_value END) AS is_closed,
      MAX(CASE WHEN pm.meta_key = '_auction_has_started'    THEN pm.meta_value END) AS has_started,
      MAX(CASE WHEN pm.meta_key = '_auction_type'           THEN pm.meta_value END) AS auction_type,
      NULL                                                                            AS fail_reason,
      'simple' AS plugin
    FROM wp_posts p
    JOIN wp_postmeta pm ON p.ID = pm.post_id
    WHERE p.post_type = 'product'
      AND EXISTS (
        SELECT 1 FROM wp_postmeta x
        WHERE x.post_id = p.ID AND x.meta_key = '_auction_start_price'
      )
      AND NOT EXISTS (
        SELECT 1 FROM wp_postmeta x
        WHERE x.post_id = p.ID AND x.meta_key = 'woo_ua_auction_start_date'
      )
    GROUP BY p.ID, p.post_title, p.post_status
    ORDER BY p.ID
  `);

  const wp = [...wooUa, ...simpleAu];
  console.log(`WP auctions — WooUA: ${wooUa.length}  Simple: ${simpleAu.length}  Total: ${wp.length}`);

  // ── 3. Fetch existing PG auctions ─────────────────────────────────────────
  const { rows: pgAuctions } = await pgClient.query(
    `SELECT id, auctionable_id, auctionable_type, status FROM auctions WHERE auctionable_type = 'book'`
  );
  const pgByBookId = Object.fromEntries(pgAuctions.map(a => [String(a.auctionable_id), a]));
  console.log(`PG auctions existing (type=book): ${pgAuctions.length}`);

  // ── 4. Book lookup: wp_post_id → PG book ─────────────────────────────────
  const { rows: books } = await pgClient.query(
    `SELECT id, wp_post_id, title, vendor_id FROM books WHERE wp_post_id IS NOT NULL`
  );
  const bookByWpId = Object.fromEntries(books.map(b => [String(b.wp_post_id), b]));
  console.log(`PG books with wp_post_id: ${books.length}`);

  // ── 5. WP user → PG user map (for winners) ──────────────────────────────
  const { rows: pgUsers } = await pgClient.query(
    `SELECT id, wp_user_id FROM users WHERE wp_user_id IS NOT NULL`
  );
  const pgUserByWpId = Object.fromEntries(pgUsers.map(u => [String(u.wp_user_id), u.id]));

  // ── 6. Categorise ─────────────────────────────────────────────────────────
  const toInsert = [], toUpdate = [], noBook = [];

  for (const row of wp) {
    const pgBook = bookByWpId[String(row.wp_id)];
    if (!pgBook) { noBook.push(row); continue; }

    const existing = pgByBookId[String(pgBook.id)];
    if (existing) {
      toUpdate.push({ ...row, pgBook, pgAuction: existing });
    } else {
      toInsert.push({ ...row, pgBook });
    }
  }

  const now = new Date();
  const activeInserts = toInsert.filter(r => {
    const end = parseDate(r.end_date);
    return end && end > now;
  });

  console.log(`\n======= SUMMARY =======`);
  console.log(`WP total:                ${wp.length}`);
  console.log(`Missing from PG:         ${toInsert.length}  (${activeInserts.length} with future end_date)`);
  console.log(`Already in PG:           ${toUpdate.length}`);
  console.log(`No matching PG book:     ${noBook.length}`);

  if (toInsert.length > 0) {
    console.log('\n--- Auctions to INSERT ---');
    toInsert.forEach(m => {
      const end = parseDate(m.end_date);
      const flag = end && end > now ? '🟢 ACTIVE' : '⚫ PAST';
      console.log(`  ${flag} WP#${m.wp_id} (${m.plugin})  pg_book=${m.pgBook.id}  bid=${m.current_bid||0}  end=${m.end_date||'?'}  "${String(m.post_title).slice(0,55)}"`);
    });
  }

  if (noBook.length > 0) {
    console.log('\n--- WP auctions with no matching PG book (wp_post_id not found) ---');
    noBook.forEach(m => console.log(`  WP#${m.wp_id} (${m.plugin})  end=${m.end_date||'?'}  "${String(m.post_title).slice(0,55)}"`));
  }

  if (DO_UPDATE && toUpdate.length > 0) {
    const needsUpdate = toUpdate.filter(r => {
      const newStatus = deriveStatus(r);
      return r.pgAuction.status !== newStatus;
    });
    console.log(`\n--- Status updates needed: ${needsUpdate.length} ---`);
    needsUpdate.forEach(r => console.log(`  PG auction#${r.pgAuction.id}  pg_book=${r.pgBook.id}  ${r.pgAuction.status} → ${deriveStatus(r)}`));
  }

  if (DRY_RUN) {
    console.log('\n(dry-run) No changes made.');
    await mc.end();
    await pgClient.end();
    return;
  }

  // ── 7. Insert missing ────────────────────────────────────────────────────
  if (toInsert.length > 0) {
    console.log('\n=== Inserting missing auctions ===');
    let inserted = 0, errors = 0;

    for (const m of toInsert) {
      const pgBook  = m.pgBook;
      const status  = deriveStatus(m);
      const startBid   = parseFloat(m.start_price) || 0;
      const currentBid = parseFloat(m.current_bid) > 0 ? parseFloat(m.current_bid) : null;
      const reserve    = m.reserve_price && parseFloat(m.reserve_price) > 0
                           ? parseFloat(m.reserve_price)
                           : null;
      const bidCount   = parseInt(m.bid_count) || 0;
      const startDate  = parseDate(m.start_date, new Date('2020-01-01T00:00:00Z'));
      const endDate    = parseDate(m.end_date,   new Date(startDate.getTime() + 180 * 86400000));
      const endedAt    = status === 'ended' ? endDate : null;

      // Resolve winner
      let pgWinnerId = null;
      if (m.winner_wp_user_id && m.winner_wp_user_id !== '0') {
        pgWinnerId = pgUserByWpId[String(m.winner_wp_user_id)] || null;
        if (!pgWinnerId) {
          console.log(`  WARN: WP winner user#${m.winner_wp_user_id} not in PG — wp_id=${m.wp_id}`);
        }
      }

      const vendorId = pgBook.vendor_id;
      if (!vendorId) {
        console.log(`  SKIP (no vendor): WP#${m.wp_id}  pg_book=${pgBook.id}`);
        errors++;
        continue;
      }

      try {
        const res = await pgClient.query(`
          INSERT INTO auctions (
            auctionable_type, auctionable_id, book_id, vendor_id,
            starting_bid, starting_price, current_bid, reserve_price,
            bid_count, starts_at, ends_at, start_date, end_date,
            status, winner_id, ended_at, end_outcome_reason,
            relist_count, payment_window_hours, created_at, updated_at
          ) VALUES (
            'book', $1, $2, $3,
            $4, $4, $5, $6,
            $7, $8, $9, $8, $9,
            $10, $11, $12, $13,
            0, 48, NOW(), NOW()
          )
          RETURNING id
        `, [
          pgBook.id, pgBook.id, vendorId,
          startBid, currentBid, reserve,
          bidCount, startDate, endDate,
          status, pgWinnerId, endedAt,
          status === 'ended' && bidCount === 0 ? 'no_bids' : null,
        ]);
        console.log(`  ✓ #${res.rows[0].id}  WP#${m.wp_id} (${m.plugin})  pg_book=${pgBook.id}  ${status}  end=${m.end_date||'?'}`);
        inserted++;
      } catch (e) {
        console.log(`  ✗ ERROR WP#${m.wp_id} pg_book=${pgBook.id}: ${e.message}`);
        errors++;
      }
    }
    console.log(`\nInserted: ${inserted}  Errors/Skipped: ${errors}`);
  }

  // ── 8. Update existing (if --update) ─────────────────────────────────────
  if (DO_UPDATE && toUpdate.length > 0) {
    console.log('\n=== Updating existing auctions ===');
    let updated = 0, errors = 0;

    for (const m of toUpdate) {
      const newStatus   = deriveStatus(m);
      const currentBid  = parseFloat(m.current_bid) > 0 ? parseFloat(m.current_bid) : null;
      const bidCount    = parseInt(m.bid_count) || 0;
      const endDate     = parseDate(m.end_date);
      const endedAt     = newStatus === 'ended' && endDate ? endDate : null;

      let pgWinnerId = null;
      if (m.winner_wp_user_id && m.winner_wp_user_id !== '0') {
        pgWinnerId = pgUserByWpId[String(m.winner_wp_user_id)] || null;
      }

      try {
        await pgClient.query(`
          UPDATE auctions SET
            status       = $1,
            current_bid  = COALESCE($2, current_bid),
            bid_count    = COALESCE($3, bid_count),
            winner_id    = COALESCE($4, winner_id),
            ended_at     = COALESCE($5, ended_at),
            updated_at   = NOW()
          WHERE id = $6
        `, [newStatus, currentBid, bidCount > 0 ? bidCount : null, pgWinnerId, endedAt, m.pgAuction.id]);
        const changed = m.pgAuction.status !== newStatus ? ` (${m.pgAuction.status}→${newStatus})` : '';
        console.log(`  ✓ auction#${m.pgAuction.id}  pg_book=${m.pgBook.id}${changed}`);
        updated++;
      } catch (e) {
        console.log(`  ✗ auction#${m.pgAuction.id}: ${e.message}`);
        errors++;
      }
    }
    console.log(`\nUpdated: ${updated}  Errors: ${errors}`);
  }

  await mc.end();
  await pgClient.end();
  console.log('\n=== Done ===');
}

main().catch(e => { console.error('FATAL:', e.message, '\n', e.stack); process.exit(1); });
