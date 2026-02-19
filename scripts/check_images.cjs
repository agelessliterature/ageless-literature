const { Pool } = require("pg");
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  // Find books with $0 price that have active auctions
  const r = await p.query(`
    SELECT b.id, b.title, b.price, b.status, a.id as auction_id, a.status as auction_status,
           a.starting_bid, a.starting_price
    FROM books b
    JOIN auctions a ON a.auctionable_id = b.id::text AND a.auctionable_type = 'book'
    WHERE (b.price IS NULL OR b.price = 0)
    LIMIT 20
  `);
  console.log("Books with $0 price AND auctions:", r.rows.length);
  console.log(JSON.stringify(r.rows.slice(0, 5), null, 2));

  // Also check all books with auctions and their prices
  const r2 = await p.query(`
    SELECT b.id, b.title, b.price, b.status, a.status as auction_status, a.starting_bid
    FROM books b
    JOIN auctions a ON a.auctionable_id = b.id::text AND a.auctionable_type = 'book'
    ORDER BY a.id DESC
    LIMIT 10
  `);
  console.log("Sample auction books with prices:");
  r2.rows.forEach(row => console.log(`  ${row.title.substring(0,40)} - book.price=${row.price}, auction.starting_bid=${row.starting_bid}, book.status=${row.status}, auction.status=${row.auction_status}`));

  await p.end();
}
run().catch(e => { console.error(e.message); p.end(); });
