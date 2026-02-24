/**
 * auction-import-from-json.mjs
 * Imports WP auction data from /tmp/wp-auctions.json into the dev Postgres DB.
 * Only connects to Postgres (no MySQL needed).
 *
 * Usage: DEV_DATABASE_URL=... node scripts/auction-import-from-json.mjs [--dry-run] [--update]
 */

import pg from 'pg';
import { readFileSync } from 'fs';

const { Client } = pg;
const DRY_RUN   = process.argv.includes('--dry-run');
const DO_UPDATE = process.argv.includes('--update');

const JSON_PATH = '/tmp/wp-auctions.json';

const PG_URL =
  process.env.DEV_DATABASE_URL ||
  process.env.DATABASE_URL ||
  null;

// Build pg connection config - prefer explicit env vars when URL has special chars
function makePgConfig() {
  if (process.env.PG_HOST) {
    return {
      host:     process.env.PG_HOST,
      port:     parseInt(process.env.PG_PORT || '5432'),
      database: process.env.PG_DB,
      user:     process.env.PG_USER,
      password: process.env.PG_PASS,
      ssl:      { rejectUnauthorized: false },
    };
  }
  if (!PG_URL) throw new Error('No PG connection: set DEV_DATABASE_URL or PG_HOST/PG_DB/PG_USER/PG_PASS');
  // Attempt URL parse (may fail if password contains special chars)
  return { connectionString: PG_URL, ssl: { rejectUnauthorized: false } };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function parseDate(str, fallback = null) {
  if (!str) return fallback;
  const d = new Date(str.includes('T') ? str : str.replace(' ', 'T') + 'Z');
  return isNaN(d.getTime()) ? fallback : d;
}

function deriveStatus(row) {
  const now        = new Date();
  const endDate    = parseDate(row.end_date);
  const isClosed   = row.is_closed === '1' || row.is_closed === 1;
  const hasStarted = row.has_started === '1' || row.has_started === 1;
  const bidCount   = parseInt(row.bid_count) || 0;

  if (!isClosed && endDate && endDate > now && hasStarted)  return 'active';
  if (!isClosed && endDate && endDate > now && !hasStarted) return 'upcoming';
  if (bidCount > 0 && row.winner_wp_user_id && row.winner_wp_user_id !== '0') return 'ended';
  return 'ended';
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Auction Import from JSON → Postgres ===');
  const host = process.env.PG_HOST || (PG_URL ? PG_URL.replace(/:[^@]+@/, ':***@') : '(env vars)');
  console.log(`PG target: ${host}`);
  if (DRY_RUN)   console.log('*** DRY RUN ***');
  if (DO_UPDATE) console.log('*** UPDATE MODE ***');
  console.log('');

  const auctions = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  console.log(`Loaded ${auctions.length} WP auctions from ${JSON_PATH}`);

  const pgClient = new Client(makePgConfig());
  await pgClient.connect();

  // ── Fetch existing PG auctions ──────────────────────────────────────────
  const { rows: pgAuctions } = await pgClient.query(
    `SELECT id, auctionable_id, auctionable_type, status FROM auctions WHERE auctionable_type = 'book'`
  );
  const pgByBookId = Object.fromEntries(pgAuctions.map(a => [String(a.auctionable_id), a]));
  console.log(`PG auctions existing (book): ${pgAuctions.length}`);

  // ── Book lookup: wp_post_id → PG book ──────────────────────────────────
  const { rows: books } = await pgClient.query(
    `SELECT id, wp_post_id, title, vendor_id FROM books WHERE wp_post_id IS NOT NULL`
  );
  const bookByWpId = Object.fromEntries(books.map(b => [String(b.wp_post_id), b]));
  console.log(`PG books with wp_post_id: ${books.length}`);

  // ── WP user → PG user map (for winners) ────────────────────────────────
  const { rows: pgUsers } = await pgClient.query(
    `SELECT id, wp_user_id FROM users WHERE wp_user_id IS NOT NULL`
  );
  const pgUserByWpId = Object.fromEntries(pgUsers.map(u => [String(u.wp_user_id), u.id]));

  // ── Categorise ──────────────────────────────────────────────────────────
  const toInsert = [], toUpdate = [], noBook = [];
  const now = new Date();

  for (const row of auctions) {
    const pgBook = bookByWpId[String(row.wp_id)];
    if (!pgBook) { noBook.push(row); continue; }

    const existing = pgByBookId[String(pgBook.id)];
    if (existing) toUpdate.push({ ...row, pgBook, pgAuction: existing });
    else          toInsert.push({ ...row, pgBook });
  }

  const activeInserts = toInsert.filter(r => {
    const end = parseDate(r.end_date);
    return end && end > now;
  });

  console.log('\n======= SUMMARY =======');
  console.log(`WP total:              ${auctions.length}`);
  console.log(`To INSERT:             ${toInsert.length}  (${activeInserts.length} active/upcoming)`);
  console.log(`Already in PG:         ${toUpdate.length}`);
  console.log(`No PG book match:      ${noBook.length}`);

  if (toInsert.length > 0) {
    console.log('\n--- Auctions to INSERT ---');
    toInsert.forEach(m => {
      const end  = parseDate(m.end_date);
      const flag = end && end > now ? '🟢 ACTIVE' : '⚫ PAST';
      console.log(`  ${flag} WP#${m.wp_id} (${m.plugin})  pg_book=${m.pgBook.id}  end=${m.end_date||'?'}  "${String(m.post_title).slice(0,55)}"`);
    });
  }

  if (noBook.length > 0) {
    console.log('\n--- WP auctions with no matching PG book ---');
    noBook.forEach(m => console.log(`  WP#${m.wp_id} (${m.plugin})  end=${m.end_date||'?'}  "${String(m.post_title).slice(0,55)}"`));
  }

  // Preview status changes (shown even in dry-run when --update is passed)
  if (DO_UPDATE && toUpdate.length > 0) {
    const needsUpdate = toUpdate.filter(r => r.pgAuction.status !== deriveStatus(r));
    if (needsUpdate.length > 0) {
      console.log(`\n--- Status updates needed: ${needsUpdate.length} of ${toUpdate.length} ---`);
      needsUpdate.forEach(r => {
        const ns = deriveStatus(r);
        console.log(`  auction#${r.pgAuction.id}  WP#${r.wp_id}  pg_book=${r.pgBook.id}  ${r.pgAuction.status} → ${ns}  end=${r.end_date||'?'}`);
      });
    } else {
      console.log(`\n--- Status updates: none needed (${toUpdate.length} already correct) ---`);
    }
  }

  if (DRY_RUN) {
    console.log('\n(dry-run) No changes made.');
    await pgClient.end();
    return;
  }

  // ── INSERT missing ──────────────────────────────────────────────────────
  let inserted = 0, updated = 0, errors = 0;

  for (const m of toInsert) {
    const pgBook    = m.pgBook;
    const status    = deriveStatus(m);
    const startBid  = parseFloat(m.start_price) || 0;
    const curBid    = parseFloat(m.current_bid) > 0 ? parseFloat(m.current_bid) : null;
    const reserve   = m.reserve_price && parseFloat(m.reserve_price) > 0
                        ? parseFloat(m.reserve_price) : null;
    const bidCount  = parseInt(m.bid_count) || 0;
    const startDate = parseDate(m.start_date, new Date('2020-01-01T00:00:00Z'));
    const endDate   = parseDate(m.end_date,   new Date(startDate.getTime() + 180 * 86400000));
    const endedAt   = status === 'ended' ? endDate : null;

    let pgWinnerId = null;
    if (m.winner_wp_user_id && m.winner_wp_user_id !== '0') {
      pgWinnerId = pgUserByWpId[String(m.winner_wp_user_id)] || null;
      if (!pgWinnerId) console.log(`  WARN: WP winner user#${m.winner_wp_user_id} not in PG — WP#${m.wp_id}`);
    }

    if (!pgBook.vendor_id) {
      console.log(`  SKIP (no vendor): WP#${m.wp_id}  pg_book=${pgBook.id}`);
      errors++; continue;
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
        pgBook.id, pgBook.id, pgBook.vendor_id,
        startBid, curBid, reserve,
        bidCount, startDate, endDate,
        status, pgWinnerId, endedAt,
        status === 'ended' && bidCount === 0 ? 'no_bids' : null,
      ]);
      console.log(`  ✓ INSERT auction#${res.rows[0].id}  WP#${m.wp_id} (${m.plugin})  pg_book=${pgBook.id}  ${status}`);
      inserted++;
    } catch (e) {
      console.log(`  ✗ ERROR WP#${m.wp_id} pg_book=${pgBook.id}: ${e.message}`);
      errors++;
    }
  }

  // ── UPDATE existing (if --update) ──────────────────────────────────────
  if (DO_UPDATE) {
    for (const m of toUpdate) {
      const newStatus = deriveStatus(m);
      const curBid    = parseFloat(m.current_bid) > 0 ? parseFloat(m.current_bid) : null;
      const bidCount  = parseInt(m.bid_count) || 0;
      const endDate   = parseDate(m.end_date);
      // Clear ended_at if auction is becoming active/upcoming
      const endedAt   = (newStatus === 'active' || newStatus === 'upcoming') ? null
                      : (newStatus === 'ended' && endDate ? endDate : null);
      // Clear end_outcome_reason if auction is active  
      const endOutcome = (newStatus === 'active' || newStatus === 'upcoming') ? null : undefined;

      let pgWinnerId = null;
      if (m.winner_wp_user_id && m.winner_wp_user_id !== '0') {
        pgWinnerId = pgUserByWpId[String(m.winner_wp_user_id)] || null;
      }

      try {
        await pgClient.query(`
          UPDATE auctions SET
            status              = $1,
            current_bid         = COALESCE($2, current_bid),
            bid_count           = GREATEST(COALESCE($3, 0), bid_count),
            winner_id           = COALESCE($4, winner_id),
            ended_at            = $5,
            ends_at             = COALESCE($6, ends_at),
            end_date            = COALESCE($6, end_date),
            end_outcome_reason  = $7,
            updated_at          = NOW()
          WHERE id = $8
        `, [
          newStatus,
          curBid,
          bidCount > 0 ? bidCount : null,
          pgWinnerId,
          endedAt,
          endDate || null,
          endOutcome !== undefined ? endOutcome : null,
          m.pgAuction.id,
        ]);
        const changed = m.pgAuction.status !== newStatus ? ` (${m.pgAuction.status}→${newStatus})` : '';
        console.log(`  ✓ UPDATE auction#${m.pgAuction.id}  WP#${m.wp_id}  pg_book=${m.pgBook.id}${changed}`);
        updated++;
      } catch (e) {
        console.log(`  ✗ ERROR auction#${m.pgAuction.id}: ${e.message}`);
        errors++;
      }
    }
  }

  console.log(`\n======= RESULTS =======`);
  console.log(`Inserted: ${inserted}  Updated: ${updated}  Errors: ${errors}`);
  await pgClient.end();
  console.log('=== Done ===');
}

main().catch(e => { console.error('FATAL:', e.message, '\n', e.stack); process.exit(1); });