import { readFileSync } from 'fs';
import pg from 'pg';

const { Client } = pg;

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error('DATABASE_URL not set'); process.exit(1); }

const auctions = JSON.parse(readFileSync('/tmp/wp-auctions.json', 'utf8'));
console.log('Read ' + auctions.length + ' WP auctions');

const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

const wpPostIds = auctions.map(a => String(a.wp_post_id));
const wpPostIdList = wpPostIds.map((_, i) => '$' + (i + 1)).join(', ');
const booksRes = await client.query(
  'SELECT id, wp_post_id, title FROM books WHERE wp_post_id IN (' + wpPostIdList + ')',
  wpPostIds
);
const booksByWpId = {};
for (const b of booksRes.rows) booksByWpId[b.wp_post_id] = b;
console.log('Matching books: ' + booksRes.rows.length);

const existingRes = await client.query('SELECT auctionable_id FROM auctions');
const existingIds = new Set(existingRes.rows.map(r => String(r.auctionable_id)));
console.log('Existing auctions: ' + existingIds.size);

const VENDOR_ID = 36;
let imported = 0, skippedDup = 0, skippedNoBook = 0;
const noBookList = [], importedList = [];

for (const wa of auctions) {
  const book = booksByWpId[String(wa.wp_post_id)];
  if (!book) { skippedNoBook++; noBookList.push(wa.wp_post_id + ':' + wa.post_title); continue; }
  const bookId = String(book.id);
  if (existingIds.has(bookId)) { skippedDup++; continue; }
  const startsAt = wa.start_date ? new Date(wa.start_date.replace(' ', 'T') + 'Z') : new Date('2020-01-01T00:00:00Z');
  const endsAt = wa.end_date ? new Date(wa.end_date.replace(' ', 'T') + 'Z') : new Date(startsAt.getTime() + 30 * 24 * 60 * 60 * 1000);
  const endedAt = wa.is_closed ? endsAt : null;
  const res = await client.query(
    'INSERT INTO auctions (auctionable_type,auctionable_id,book_id,vendor_id,starting_bid,starting_price,current_bid,reserve_price,bid_count,starts_at,ends_at,start_date,end_date,status,winner_id,ended_at,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$5,$6,$7,$8,$9,$10,$9,$10,$11,NULL,$12,NOW(),NOW()) RETURNING id',
    ['book',book.id,book.id,VENDOR_ID,wa.start_price,wa.current_bid,wa.reserve_price,wa.bid_count,startsAt,endsAt,wa.status,endedAt]
  );
  imported++;
  importedList.push('[' + res.rows[0].id + '] ' + wa.post_title.substring(0,50) + ' status=' + wa.status + ' bid=$' + wa.current_bid);
  existingIds.add(bookId);
}

await client.end();
console.log('\n=== IMPORT SUMMARY ===');
console.log('Imported: ' + imported);
console.log('Skipped dup: ' + skippedDup);
console.log('Skipped no-book: ' + skippedNoBook);
if (noBookList.length) { console.log('No book found for:'); noBookList.forEach(x => console.log('  ' + x)); }
if (importedList.length) { console.log('Imported:'); importedList.forEach(x => console.log('  ' + x)); }
