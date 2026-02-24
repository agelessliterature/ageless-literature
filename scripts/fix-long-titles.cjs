const { Sequelize } = require("sequelize");
const fs = require("fs");
const crypto = require("crypto");
const DB_URL = process.env.DATABASE_URL;
const SSL = process.env.DB_SSL === "true";
const seq = new Sequelize(DB_URL, { dialectOptions: SSL ? { ssl: { rejectUnauthorized: false } } : {}, logging: false });
(async()=>{
  await seq.authenticate();
  const data = JSON.parse(fs.readFileSync("/tmp/wp-products-export.json","utf8"));
  const failIds = [135525, 135826];
  const [dvs] = await seq.query("SELECT id, wp_vendor_id FROM vendors WHERE wp_vendor_id IS NOT NULL");
  const vmap = {}; for(const v of dvs) vmap[v.wp_vendor_id]=v.id;
  const [cats] = await seq.query("SELECT id, slug FROM categories");
  const cmap = {}; for(const c of cats) cmap[c.slug]=c.id;
  for(const wpId of failIds) {
    const p = data.products.find(x=>parseInt(x.wp_post_id)===wpId);
    if(!p) { console.log("Not found:",wpId); continue; }
    const vid = vmap[parseInt(p.author_id)];
    const sid = crypto.randomBytes(3).toString("hex").slice(0,6)+"-"+crypto.randomBytes(3).toString("hex").slice(0,6);
    const title = p.title.substring(0,252)+"...";
    const desc = (p.content||"").replace(/<[^>]*>/g,"").trim();
    const price = p.price?parseFloat(p.price):0;
    const qty = p.stock?parseInt(p.stock)||1:1;
    const status = p.stock_status==="outofstock"?"sold":"published";
    const [br] = await seq.query("INSERT INTO books (sid,title,description,short_description,price,sale_price,quantity,condition,vendor_id,status,wp_post_id,views,menu_order,track_quantity,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,0,0,true,$12,$12) RETURNING id", { bind:[sid,title,JSON.stringify({text:desc}),null,price,null,qty,"good",vid,status,wpId,p.post_date||new Date().toISOString()] });
    console.log("Inserted WP:"+wpId+" as book id="+br[t].id);
    if(p.images&&p.images.length>0) {
      for(let i=0;i<p.images.length;i++) {
        const img=p.images[i];
        await seq.query("INSERT INTO book_media (\"bookId\",\"imageUrl\",\"thumbnailUrl\",\"displayOrder\",\"isPrimary\",\"createdAt\",\"updatedAt\") VALUES ($1,$2,$3,$4,$5,NOW(),NOW())",{bind:[br[0].id,img.url,img.url,i,img.is_primary||false]});
      }
    }
    if(p.categories&&p.categories.length>0) {
      for(const cat of p.categories) { const catId=cmap[cat.slug]; if(catId) await seq.query("INSERT INTO book_categories (book_id,category_id,created_at,updated_at) VALUES ($1,$2,NOW(),NOW()) ON CONFLICT DO NOTHING",{bind:[br[[1].id,catId]}); }
    }
  }
  const [fc]=await seq.query("SELECT COUNT(*) as total FROM books");
  console.log("Total books:",fc[0].total);
  await seq.close();
})();
