import { readFileSync, writeFileSync } from 'fs';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: process.env.PG_HOST,
  port: parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DB,
  user: process.env.PG_USER,
  password: process.env.PG_PASS,
  ssl: { rejectUnauthorized: false }
});

const wpRaw = JSON.parse(readFileSync('/tmp/wp_prices_fresh.json', 'utf8'));
const wpMap = new Map(wpRaw.map(p => [String(p.wp_id), p]));
console.log('WP products loaded:', wpMap.size);

const { rows: devBooks } = await pool.query(
  `SELECT id, wp_post_id, price::float, sale_price::float, title, status FROM books WHERE wp_post_id IS NOT NULL ORDER BY id`
);
console.log('Dev books with wp_post_id:', devBooks.length);

let ok = 0, mismatches = [], noPrice = 0, wpMissing = 0;

for (const b of devBooks) {
  const wp = wpMap.get(String(b.wp_post_id));
  if (!wp) { wpMissing++; continue; }

  const wpPrice = parseFloat(wp.price || '0');
  const wpSale  = wp.sale_price  ? parseFloat(wp.sale_price)  : null;
  const wpReg   = wp.regular_price ? parseFloat(wp.regular_price) : null;
  const devPrice = b.price || 0;
  const devSale  = b.sale_price != null ? b.sale_price : null;

  if (!wp.price && wp.price !== 0) { noPrice++; continue; }

  const priceDiff = Math.abs(devPrice - wpPrice);
  const saleDiff  = wpSale != null && devSale == null ? wpSale :
                    (wpSale != null && devSale != null ? Math.abs(devSale - wpSale) : 0);

  if (priceDiff > 0.01 || (wpSale != null && devSale == null)) {
    mismatches.push({
      devId: b.id, wpId: b.wp_post_id,
      title: b.title?.slice(0, 60),
      devPrice, devSale,
      wpPrice, wpRegular: wpReg, wpSale,
      priceDiff: priceDiff.toFixed(2),
      saleDiff: saleDiff ? Number(saleDiff).toFixed(2) : '0',
      bookStatus: b.status
    });
  } else {
    ok++;
  }
}

// Classify mismatches
const realPriceDiffs = mismatches.filter(m => parseFloat(m.priceDiff) > 0.01);
const saleOnly       = mismatches.filter(m => parseFloat(m.priceDiff) <= 0.01);
const realSales      = saleOnly.filter(m => m.wpSale && m.wpRegular && parseFloat(m.wpSale) < parseFloat(m.wpRegular));
const fakeSales      = saleOnly.filter(m => !m.wpSale || !m.wpRegular || parseFloat(m.wpSale) >= parseFloat(m.wpRegular || 0));

console.log('\n=== PRICE COMPARISON RESULTS ===');
console.log('Total compared:           ', devBooks.length - wpMissing - noPrice);
console.log('Matching (within $0.01):  ', ok);
console.log('WP product not found:     ', wpMissing);
console.log('WP price null/empty:      ', noPrice);
console.log('Total mismatches:         ', mismatches.length);
console.log('  Real price diffs:       ', realPriceDiffs.length);
console.log('  Sale-price only:        ', saleOnly.length);
console.log('    Real sales (missing): ', realSales.length);
console.log('    WP artifacts (=price):', fakeSales.length);

if (realPriceDiffs.length > 0) {
  console.log('\n--- ACTUAL PRICE MISMATCHES ---');
  realPriceDiffs.sort((a,b) => parseFloat(b.priceDiff) - parseFloat(a.priceDiff)).forEach(m => {
    const dir = m.devPrice > m.wpPrice ? 'dev>wp' : 'dev<wp';
    console.log(`  WP#${m.wpId} book#${m.devId}  dev=$${m.devPrice}  wp=$${m.wpPrice}  diff=$${m.priceDiff}  [${dir}]  "${m.title}"`);
  });
} else {
  console.log('\n✅ All prices match — no actual price mismatches!');
}

if (realSales.length > 0) {
  console.log('\n--- MISSING SALE PRICES (wp has sale but dev does not) ---');
  realSales.forEach(m => {
    console.log(`  WP#${m.wpId} book#${m.devId}  regular=$${m.wpRegular}  sale=$${m.wpSale}  "${m.title}"`);
  });
} else {
  console.log('✅ All sale prices in sync!');
}

if (fakeSales.length > 0) {
  console.log(`\n--- WP ARTIFACTS (${fakeSales.length} books where wp sale_price = price, not real sales) ---`);
  console.log('  (These are safe to ignore — WP stores sale_price=price when not on sale)');
}

const report = { generatedAt: new Date().toISOString(), total: devBooks.length, ok, mismatches: mismatches.length, noPrice, wpMissing, realPriceDiffs: realPriceDiffs.length, realSalesMissing: realSales.length, details: { realPriceDiffs, realSales, fakeSales } };
writeFileSync('/tmp/price_report_v2.json', JSON.stringify(report, null, 2));
console.log('\nFull report → /tmp/price_report_v2.json');

await pool.end();
