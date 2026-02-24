import { Sequelize } from 'sequelize';
import { readFileSync } from 'fs';
import { randomBytes } from 'crypto';

const DB_URL = process.env.DATABASE_URL;
const SSL = process.env.DB_SSL === 'true';
const seq = new Sequelize(DB_URL, {
  dialectOptions: SSL ? { ssl: { rejectUnauthorized: false } } : {},
  logging: false,
});

function genSid() {
  return randomBytes(3).toString('hex').slice(0,6) + '-' + randomBytes(3).toString('hex').slice(0,6);
}

function strip(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'").trim();
}

async function main() {
  await seq.authenticate();
  console.log('Connected to dev DB');

  const data = JSON.parse(readFileSync('/tmp/wp-products-export.json', 'utf8'));
  console.log('Loaded ' + data.stats.new_products + ' new products');

  const [dvs] = await seq.query('SELECT id, wp_vendor_id FROM vendors WHERE wp_vendor_id IS NOT NULL');
  const vmap = {};
  for (const v of dvs) vmap[v.wp_vendor_id] = v.id;
  console.log(dvs.length + ' dev vendors mapped');

  const authorIds = [...new Set(data.products.map(p => parseInt(p.author_id)))];
  for (const aid of authorIds) {
    if (!vmap[aid]) {
      const vinfo = data.vendors_with_new.find(v => parseInt(v.ID) === aid);
      if (vinfo) {
        console.log('Creating vendor: ' + (vinfo.store_name || vinfo.display_name) + ' (WP:' + aid + ')');
        const [r] = await seq.query(
          "INSERT INTO vendors (shop_name, wp_vendor_id, status, commission_rate, balance_available, balance_pending, lifetime_gross_sales, lifetime_commission_taken, lifetime_vendor_earnings, is_featured, created_at, updated_at) VALUES ($1, $2, 'approved', 11, 0, 0, 0, 0, 0, false, NOW(), NOW()) RETURNING id",
          { bind: [vinfo.store_name || vinfo.display_name, aid] }
        );
        vmap[aid] = r[0].id;
        console.log('Created vendor id=' + r[0].id);
      }
    }
  }

  const [cats] = await seq.query('SELECT id, slug FROM categories');
  const cmap = {};
  for (const c of cats) cmap[c.slug] = c.id;

  const [existing] = await seq.query('SELECT wp_post_id FROM books WHERE wp_post_id IS NOT NULL');
  const existSet = new Set(existing.map(b => String(b.wp_post_id)));
  console.log(existSet.size + ' books already in dev');

  let imported = 0, skipped = 0, failed = 0;

  for (const p of data.products) {
    const wpId = String(p.wp_post_id);
    if (existSet.has(wpId)) { skipped++; continue; }

    const vid = vmap[parseInt(p.author_id)];
    if (!vid) { console.log('No vendor for author ' + p.author_id + ', skip: ' + p.title); failed++; continue; }

    try {
      const sid = genSid();
      const price = p.price ? parseFloat(p.price) : 0;
      const salePrice = p.sale_price ? parseFloat(p.sale_price) : null;
      const qty = p.stock ? parseInt(p.stock) || 1 : 1;
      const status = p.stock_status === 'outofstock' ? 'sold' : 'published';
      const desc = p.content ? strip(p.content) : '';
      const shortDesc = p.excerpt ? strip(p.excerpt) : null;

      const [br] = await seq.query(
        'INSERT INTO books (sid, title, description, short_description, price, sale_price, quantity, condition, vendor_id, status, wp_post_id, views, menu_order, track_quantity, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,0,0,true,$12,$12) RETURNING id',
        { bind: [sid, p.title, JSON.stringify({text:desc}), shortDesc, price, salePrice, qty, 'good', vid, status, parseInt(wpId), p.post_date || new Date().toISOString()] }
      );
      const bookId = br[0].id;

      if (p.images && p.images.length > 0) {
        for (let i = 0; i < p.images.length; i++) {
          const img = p.images[i];
          try {
            await seq.query(
              'INSERT INTO book_media ("bookId","imageUrl","thumbnailUrl","displayOrder","isPrimary","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,NOW(),NOW())',
              { bind: [bookId, img.url, img.url, i, img.is_primary || false] }
            );
          } catch(e) {}
        }
      }

      if (p.categories && p.categories.length > 0) {
        for (const cat of p.categories) {
          const catId = cmap[cat.slug];
          if (catId) {
            try {
              await seq.query('INSERT INTO book_categories (book_id, category_id, created_at, updated_at) VALUES ($1,$2,NOW(),NOW()) ON CONFLICT DO NOTHING', { bind: [bookId, catId] });
            } catch(e) {}
          }
        }
      }

      imported++;
      if (imported % 20 === 0) console.log('Imported ' + imported + '...');
    } catch(err) {
      console.log('FAIL "' + p.title + '" (WP:' + wpId + '): ' + err.message);
      failed++;
    }
  }

  console.log('\nDONE: imported=' + imported + ' skipped=' + skipped + ' failed=' + failed);
  const [fc] = await seq.query('SELECT COUNT(*) as total FROM books');
  console.log('Total books in dev: ' + fc[0].total);
  await seq.close();
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
