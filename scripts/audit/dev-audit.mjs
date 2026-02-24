/**
 * READ-ONLY audit of the dev Postgres database.
 * Outputs JSON to stdout. No writes performed.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pg = require('pg');
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const q  = async (sql, vals=[]) => { const r = await client.query(sql, vals.length ? vals : undefined); return r.rows; };
const q1 = async (sql, vals=[]) => { const rows = await q(sql, vals); return rows[0] ? Object.values(rows[0])[0] : 0; };

const result = {};

// ── 1. TABLE INVENTORY ──────────────────────────────────────────────────────
const tables = await q(
  "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
);
result.all_tables = tables.map(r => r.table_name);

// Row counts
const countResults = await Promise.all(result.all_tables.map(async t => {
  try {
    const cnt = await q1(`SELECT COUNT(*) as cnt FROM "${t}"`);
    return [t, Number(cnt)];
  } catch { return [t, -1]; }
}));
result.table_counts = Object.fromEntries(countResults);

// ── 2. SCHEMA COLUMNS ────────────────────────────────────────────────────────
const cols = await q(`
  SELECT table_name, column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema='public'
  ORDER BY table_name, ordinal_position
`);
const schema = {};
for (const c of cols) {
  if (!schema[c.table_name]) schema[c.table_name] = [];
  schema[c.table_name].push({ col: c.column_name, type: c.data_type, nullable: c.is_nullable });
}
result.schema = schema;

// ── 3. USERS ─────────────────────────────────────────────────────────────────
result.users = {
  total: await q1("SELECT COUNT(*) FROM users"),
  by_role: await q("SELECT role, COUNT(*) as cnt FROM users GROUP BY role ORDER BY cnt DESC"),
  by_status: await q("SELECT status, COUNT(*) as cnt FROM users GROUP BY status ORDER BY cnt DESC"),
  with_stripe: await q1("SELECT COUNT(*) FROM users WHERE stripe_customer_id IS NOT NULL"),
  with_provider: await q("SELECT provider, COUNT(*) as cnt FROM users WHERE provider IS NOT NULL GROUP BY provider ORDER BY cnt DESC"),
};

// ── 4. VENDORS ────────────────────────────────────────────────────────────────
result.vendors = {
  total: await q1("SELECT COUNT(*) FROM vendors"),
  with_stripe_account: await q1("SELECT COUNT(*) FROM vendors WHERE stripe_account_id IS NOT NULL").catch(()=>0),
  schema_cols: schema['vendors'] || [],
  vendor_profile_schema: schema['vendor_profiles'] || [],
};
// Check for vendor-related tables
result.vendor_tables = result.all_tables.filter(t => t.includes('vendor'));

// ── 5. BOOKS / PRODUCTS ───────────────────────────────────────────────────────
result.books = {
  total: await q1("SELECT COUNT(*) FROM books"),
  by_status: await q("SELECT status, COUNT(*) as cnt FROM books GROUP BY status ORDER BY cnt DESC"),
  with_wp_post_id: await q1("SELECT COUNT(*) FROM books WHERE wp_post_id IS NOT NULL"),
  categories: await q("SELECT category, COUNT(*) as cnt FROM books GROUP BY category ORDER BY cnt DESC LIMIT 20"),
  conditions: await q("SELECT condition, COUNT(*) as cnt FROM books GROUP BY condition ORDER BY cnt DESC"),
  with_price: await q1("SELECT COUNT(*) FROM books WHERE price > 0"),
  with_sale_price: await q1("SELECT COUNT(*) FROM books WHERE sale_price IS NOT NULL AND sale_price > 0").catch(()=>0),
  schema_cols: schema['books'] || [],
};

// ── 6. ORDERS ─────────────────────────────────────────────────────────────────
result.orders = {
  total: await q1("SELECT COUNT(*) FROM orders"),
  by_status: await q("SELECT status, COUNT(*) as cnt FROM orders GROUP BY status ORDER BY cnt DESC"),
  with_stripe: await q1("SELECT COUNT(*) FROM orders WHERE stripe_payment_intent_id IS NOT NULL").catch(()=>0),
  total_revenue: await q1("SELECT COALESCE(SUM(total),0) FROM orders WHERE status NOT IN ('cancelled','refunded')").catch(()=>0),
  schema_cols: schema['orders'] || [],
};

result.order_items = {
  total: await q1("SELECT COUNT(*) FROM order_items").catch(()=>0),
  schema_cols: schema['order_items'] || [],
};

// ── 7. AUCTIONS ───────────────────────────────────────────────────────────────
result.auctions = {
  total: await q1("SELECT COUNT(*) FROM auctions"),
  by_status: await q("SELECT status, COUNT(*) as cnt FROM auctions GROUP BY status ORDER BY cnt DESC"),
  with_winner: await q1("SELECT COUNT(*) FROM auctions WHERE winner_id IS NOT NULL"),
  active: await q1("SELECT COUNT(*) FROM auctions WHERE status='active'"),
  schema_cols: schema['auctions'] || [],
};

result.auction_bids = {
  total: await q1("SELECT COUNT(*) FROM auction_bids").catch(()=>0),
  schema_cols: schema['auction_bids'] || [],
};

result.auction_tables = result.all_tables.filter(t => t.includes('auction'));

// ── 8. EARNINGS / PAYOUTS ────────────────────────────────────────────────────
result.vendor_earnings = {
  total: await q1("SELECT COUNT(*) FROM vendor_earnings").catch(()=>'table missing'),
  by_status: await q("SELECT status, COUNT(*) as cnt FROM vendor_earnings GROUP BY status ORDER BY cnt DESC").catch(()=>[]),
  total_amount: await q1("SELECT COALESCE(SUM(amount),0) FROM vendor_earnings").catch(()=>0),
  schema_cols: schema['vendor_earnings'] || [],
};
result.payout_tables = result.all_tables.filter(t => t.match(/payout|withdraw|earning|commission|balance/));

// Check for payouts/withdrawals table
for (const pt of result.payout_tables) {
  result[`payout_${pt}`] = {
    count: await q1(`SELECT COUNT(*) FROM "${pt}"`).catch(()=>0),
    schema_cols: schema[pt] || [],
  };
}

// ── 9. SHIPPING ───────────────────────────────────────────────────────────────
result.shipping_tables = result.all_tables.filter(t => t.match(/shipping|tracking|fulfillment/));
result.shipping = {
  order_items_with_shipping: await q("SELECT order_item_type, COUNT(*) as cnt FROM order_items GROUP BY order_item_type ORDER BY cnt DESC").catch(()=>[]),
};

// ── 10. NOTIFICATIONS / MEDIA / CONTENT ──────────────────────────────────────
result.notifications = {
  total: await q1("SELECT COUNT(*) FROM notifications").catch(()=>'table missing'),
  by_type: await q("SELECT type, COUNT(*) as cnt FROM notifications GROUP BY type ORDER BY cnt DESC LIMIT 20").catch(()=>[]),
  schema_cols: schema['notifications'] || [],
};

result.book_images = {
  total: await q1("SELECT COUNT(*) FROM book_images").catch(()=>'table missing'),
  schema_cols: schema['book_images'] || [],
};

// ── 11. STRIPE / PAYMENT INFRASTRUCTURE ──────────────────────────────────────
result.payment_tables = result.all_tables.filter(t => t.match(/payment|stripe|charge|refund|transaction/));
result.stripe_info = {};
for (const pt of result.payment_tables) {
  result.stripe_info[pt] = {
    count: await q1(`SELECT COUNT(*) FROM "${pt}"`).catch(()=>0),
    schema_cols: schema[pt] || [],
  };
}

// ── 12. MISC TABLES ───────────────────────────────────────────────────────────
result.other_notable_tables = result.all_tables.filter(t =>
  t.match(/review|wish|favorite|follow|cart|session|coupon|discount|tax|promo|collection|tag|categor|shelf/)
);
for (const t of result.other_notable_tables) {
  result[`misc_${t}`] = await q1(`SELECT COUNT(*) FROM "${t}"`).catch(()=>0);
}

// ── 13. INDEXES / CONSTRAINTS ────────────────────────────────────────────────
result.foreign_keys = await q(`
  SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
  ORDER BY tc.table_name
`);

await client.end();
process.stdout.write(JSON.stringify(result, null, 2));
process.stderr.write('Dev audit complete\n');
