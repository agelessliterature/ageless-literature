// Import auction data for WP auctions whose books couldn't be matched by wp_post_id
// but were found by title. Books are NOT modified — only auction records are created.
import { createRequire } from 'module';
import { readFileSync } from 'fs';
const require = createRequire(import.meta.url);
const { Sequelize } = require('sequelize');

const s = new Sequelize(process.env.DATABASE_URL, {
  logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
});

// Explicit mapping: wp_post_id (trashed) → best matching PG book id (from title search)
// Only confident single-match or highly specific title matches are included.
// Skipped: 4933 (false positives), 5421/123719/123720 (no PG book), 127974 (test product)
const WP_TO_PG_BOOK = {
  123637: 11611,  // A Landmark in American Art
  8349:   540,    // Jungle Tales of Tarzan by Edgar Rice Burroughs 1919
  6834:   6566,   // Gone With the Wind (1964 ed → generic PG entry)
  123691: 10694,  // 1513 Illustrated Poeticon Astronomicon
  123706: 11849,  // Frankenstein First Abridged Edition by Mary Shelley 1897
  117599: 11706,  // Aleister Crowley & Jack Parsons: Unpublished Typescript
  124168: 12034,  // Octopussy And The Living Daylights - Ian Fleming
  124228: 10965,  // The Dharma Bums by Jack Kerouac First Printing 1958
  124227: 11847,  // A Sermon Preached Dec 29 1799 - George Washington
  125261: 524,    // Thomas Pynchon's Copies of Gravity's Rainbow First Spanish Edition
  125265: 11839,  // Kabumpo in Oz First Edition 1922
  125266: 11844,  // Ulysses By James Joyce First Trade Edition 1937
  125267: 612,    // Lord of the Flies Association Copy Inscribed by William Golding
  125269: 11971,  // Charles Darwin's Journal Second Edition 1845
  125271: 11995,  // The Mystery of Edwin Drood First Printings Charles Dickens
  125273: 11845,  // The Stranger First American Edition By Albert Camus
  125274: 11843,  // Book Of Lost Tales Part II Tolkien
  125961: 11846,  // Gone With The Wind Signed by Olivia de Havilland
  126176: 4396,   // Superman By Andy Warhol Signed Lithograph Print
  126177: 4397,   // Mickey Mouse by Andy Warhol Signed Lithograph Print
  126179: 12007,  // The Expression of Emotions in Man & Animals Darwin 1872
  126184: 11842,  // A Haunted House and Other Stories Virginia Woolf 1943
  126186: 11840,  // The Proud Highway Signed by Hunter S. Thompson
  126187: 508,    // The Lathe of Heaven Inscribed by Ursula K Le Guin
  126189: 456,    // Forrest Gump Advanced Reading Copy & Signed First Edition
  126190: 11841,  // The African Game Trails by Theodore Roosevelt First Edition
  127413: 11614,  // Koberger's 1492 Masterpiece of Preaching
  127760: 11839,  // Kabumpo in Oz (duplicate WP listing → same PG book as 125265)
  133085: 12112,  // George Harrison Celebrates His 21st With His First Cigar
  134175: 11711,  // The Fountainhead by Ayn Rand First Edition Second Impression
};

const auctions = JSON.parse(readFileSync('/tmp/wp-auctions.json', 'utf8'));
const wpAuctionByPostId = {};
for (const a of auctions) wpAuctionByPostId[a.wp_post_id] = a;

// Get existing auctionable_ids so we don't duplicate
const [existingRows] = await s.query('SELECT auctionable_id FROM auctions');
const existingIds = new Set(existingRows.map(r => String(r.auctionable_id)));
console.log('Existing auctions: ' + existingIds.size);

const VENDOR_ID = 36;
let imported = 0, skippedDup = 0, skippedNoData = 0;
const results = [];

for (const [wpPostId, pgBookId] of Object.entries(WP_TO_PG_BOOK)) {
  const bookId = String(pgBookId);

  if (existingIds.has(bookId)) {
    skippedDup++;
    results.push('  SKIP_DUP  book=' + bookId + ' wp=' + wpPostId);
    continue;
  }

  const wa = wpAuctionByPostId[parseInt(wpPostId)];
  if (!wa) {
    skippedNoData++;
    results.push('  SKIP_NODATA wp=' + wpPostId);
    continue;
  }

  const startsAt = wa.start_date ? new Date(wa.start_date.replace(' ', 'T') + 'Z') : new Date('2020-01-01T00:00:00Z');
  const endsAt   = wa.end_date   ? new Date(wa.end_date.replace(' ', 'T') + 'Z')   : new Date(startsAt.getTime() + 30 * 24 * 60 * 60 * 1000);
  const endedAt  = wa.is_closed  ? endsAt : null;

  const sql = [
    'INSERT INTO auctions',
    '(auctionable_type, auctionable_id, book_id, vendor_id,',
    ' starting_bid, starting_price, current_bid, reserve_price,',
    ' bid_count, starts_at, ends_at, start_date, end_date,',
    ' status, winner_id, ended_at, created_at, updated_at)',
    'VALUES',
    "('book', $1, $2, $3,",
    ' $4, $4, $5, $6,',
    ' $7, $8, $9, $8, $9,',
    ' $10, NULL, $11, NOW(), NOW())',
    'RETURNING id',
  ].join(' ');

  const res = await s.query(sql, {
    bind: [pgBookId, pgBookId, VENDOR_ID, wa.start_price, wa.current_bid,
           wa.reserve_price, wa.bid_count, startsAt, endsAt, wa.status, endedAt],
    type: 'INSERT',
  });

  const newId = res[0][0]?.id ?? res[0]?.id ?? '?';
  imported++;
  existingIds.add(bookId);
  results.push('  IMPORTED  [' + newId + '] book=' + pgBookId + ' wp=' + wpPostId + ' ' + wa.status + ' bid=$' + wa.current_bid + ' bids=' + wa.bid_count + ' "' + wa.post_title.substring(0, 50) + '"');
}

await s.close();

console.log('\n=== TITLE-MATCH IMPORT SUMMARY ===');
console.log('Imported:            ' + imported);
console.log('Skipped (dup):       ' + skippedDup);
console.log('Skipped (no data):   ' + skippedNoData);
console.log('');
results.forEach(r => console.log(r));
