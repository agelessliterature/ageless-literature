/**
 * check-auction-media.mjs
 * Quick health check: do active auction books have images in book_media?
 */
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host:     process.env.PG_HOST,
  port:     parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DB,
  user:     process.env.PG_USER,
  password: process.env.PG_PASS,
  ssl:      { rejectUnauthorized: false },
});
await client.connect();

const activeWpIds = [
  132826, 132872, 133064, 133075, 133091, 133100,
  133107, 133117, 133125, 133131, 133134, 133142,
  133147, 133153, 133156, 133324, 133325,
];

// Check active auction WP IDs
const { rows } = await client.query(
  `SELECT b.id, b.wp_post_id, b.title,
     a.id AS auction_id, a.status AS auction_status, a.ends_at,
     COUNT(bm.id) AS media_count,
     MAX(bm."imageUrl") AS sample_image
   FROM books b
   LEFT JOIN book_media bm ON bm."bookId" = b.id
   LEFT JOIN auctions a ON a.auctionable_id = b.id::text AND a.auctionable_type = 'book'
   WHERE b.wp_post_id = ANY($1::int[])
   GROUP BY b.id, b.wp_post_id, b.title, a.id, a.status, a.ends_at
   ORDER BY b.wp_post_id`,
  [activeWpIds]
);
console.log(`\n=== Active WP auction books (${rows.length} found) ===`);
rows.forEach(r => {
  const flag = parseInt(r.media_count) > 0 ? '✅' : '❌';
  console.log(`  ${flag} WP#${r.wp_post_id}  book=${r.id}  auction=${r.auction_id || 'NONE'}  status=${r.auction_status || 'NONE'}  media=${r.media_count}`);
  if (r.sample_image) console.log(`     img: ${r.sample_image}`);
  else console.log(`     title: ${String(r.title).slice(0, 60)}`);
});

// Summary of all auctions
const { rows: s } = await client.query(
  `SELECT a.status, COUNT(*) AS cnt FROM auctions a WHERE a.auctionable_type = 'book' GROUP BY a.status ORDER BY cnt DESC`
);
console.log('\n=== Dev auction status breakdown ===');
s.forEach(r => console.log(`  ${r.status}: ${r.cnt}`));

// Media coverage
const { rows: m } = await client.query(`
  SELECT
    COUNT(*) AS total,
    COUNT(*) FILTER(WHERE mc.cnt > 0) AS with_media,
    COUNT(*) FILTER(WHERE mc.cnt = 0 OR mc.cnt IS NULL) AS no_media
  FROM auctions a
  LEFT JOIN (
    SELECT "bookId", COUNT(*) AS cnt FROM book_media GROUP BY "bookId"
  ) mc ON mc."bookId" = a.auctionable_id::int
  WHERE a.auctionable_type = 'book'
`);
console.log(`\nBook auctions total: ${m[0].total}  with_media: ${m[0].with_media}  no_media: ${m[0].no_media}`);

// Sample books with NO media (active auctions)
const { rows: noMedia } = await client.query(`
  SELECT a.id AS auction_id, a.status, b.wp_post_id, b.id AS book_id, b.title
  FROM auctions a
  JOIN books b ON b.id = a.auctionable_id::int
  LEFT JOIN (SELECT "bookId", COUNT(*) AS cnt FROM book_media GROUP BY "bookId") mc ON mc."bookId" = b.id
  WHERE a.auctionable_type = 'book' AND a.status IN ('active','upcoming') AND (mc.cnt IS NULL OR mc.cnt = 0)
  ORDER BY a.id
  LIMIT 10
`);
if (noMedia.length > 0) {
  console.log(`\n!!! Active/upcoming auctions with NO images (first 10) !!!`);
  noMedia.forEach(r => console.log(`  auction#${r.auction_id}  WP#${r.wp_post_id}  book=${r.book_id}  "${String(r.title).slice(0,55)}"`));
}

await client.end();
