const { Pool } = require("pg");
const fs = require("fs");

const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const sql = fs.readFileSync("/app/correct_image_updates.sql", "utf8");
  const statements = sql.split("\n").filter(s => s.trim().startsWith("UPDATE"));

  console.log(`Total statements: ${statements.length}`);

  let changed = 0;
  let errors = 0;
  const BATCH = 500;

  for (let i = 0; i < statements.length; i += BATCH) {
    const batch = statements.slice(i, i + BATCH);
    const client = await p.connect();
    try {
      await client.query("BEGIN");
      for (const stmt of batch) {
        const res = await client.query(stmt);
        changed += res.rowCount || 0;
      }
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      console.error("Batch error:", e.message.substring(0, 100));
      errors++;
    } finally {
      client.release();
    }
    if ((i / BATCH) % 10 === 0) {
      console.log(`  Progress: ${i + batch.length}/${statements.length} (changed: ${changed})`);
    }
  }

  console.log(`DONE. ${statements.length} statements, ${changed} rows changed, ${errors} errors.`);
  await p.end();
}

run().catch(e => { console.error(e.message); p.end(); });
