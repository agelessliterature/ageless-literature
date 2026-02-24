#!/usr/bin/env node
/**
 * wp_sync_users_readonly.mjs
 *
 * Reads users from WordPress MySQL (READ-ONLY) and upserts them into the
 * Dev Postgres database.  Run with --apply to write; default is dry-run.
 *
 * Usage:
 *   node scripts/migrations/wp_sync_users_readonly.mjs              # dry-run
 *   node scripts/migrations/wp_sync_users_readonly.mjs --apply      # write
 *   node scripts/migrations/wp_sync_users_readonly.mjs --limit 50   # dry-run, first 50
 *
 * Required env vars (see .env):
 *   WP_DB_HOST, WP_DB_NAME, WP_DB_USER, WP_DB_PASSWORD, WP_TABLE_PREFIX
 *   DATABASE_URL
 */

import 'dotenv/config';
import mysql from 'mysql2/promise';
import { Sequelize, DataTypes, Op } from 'sequelize';
import { unserialize } from 'php-serialize';

// ── CLI flags ─────────────────────────────────────────────────────────────────────────────

const APPLY    = process.argv.includes('--apply');
const LIMIT    = (() => { const i = process.argv.indexOf('--limit'); return i > -1 ? parseInt(process.argv[i + 1], 10) : null; })();
const DRY_RUN  = !APPLY;
const PREFIX   = process.env.WP_TABLE_PREFIX || 'wp_';

// ── WP role mapping ──────────────────────────────────────────────────────────────────────────────────

const WP_ROLE_MAP = { administrator: 'admin', vendor: 'vendor', dokan_vendor: 'vendor', wcfm_vendor: 'vendor' };

function mapWpRole(capabilitiesRaw) {
  if (!capabilitiesRaw) return 'customer';
  try {
    const caps = unserialize(capabilitiesRaw);
    if (typeof caps !== 'object') return 'customer';
    for (const wpRole of Object.keys(caps)) {
      const devRole = WP_ROLE_MAP[wpRole];
      if (devRole) return devRole;
    }
  } catch {
    // Malformed capabilities — default to customer
  }
  return 'customer';
}

// ── DB connections ───────────────────────────────────────────────────────────────────────────────

async function openWpConnection() {
  return mysql.createConnection({
    host:     process.env.WP_DB_HOST,
    database: process.env.WP_DB_NAME,
    user:     process.env.WP_DB_USER,
    password: process.env.WP_DB_PASSWORD,
    port:     process.env.WP_DB_PORT ? parseInt(process.env.WP_DB_PORT, 10) : 3306,
    ssl:      { rejectUnauthorized: false },
    connectTimeout: 10000,
  });
}

function openDevConnection() {
  return new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: { ssl: process.env.DATABASE_URL.includes('localhost') ? false : { require: true, rejectUnauthorized: false } },
  });
}

// ── Main ───────────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n=== WP → Dev User Sync (${DRY_RUN ? 'DRY-RUN' : 'APPLY'}) ===\n`);

  // Validate env vars
  for (const v of ['WP_DB_HOST', 'WP_DB_NAME', 'WP_DB_USER', 'WP_DB_PASSWORD', 'DATABASE_URL']) {
    if (!process.env[v]) throw new Error(`Missing required env var: ${v}`);
  }

  const wp  = await openWpConnection();
  const dev = openDevConnection();

  let scanned = 0, created = 0, updated = 0, skipped = 0;

  try {
    // Load all WP users
    const [wpUsers] = await wp.execute(
      `SELECT u.ID, u.user_email, u.display_name, u.user_pass, u.user_registered
       FROM \`${PREFIX}users\` u
       ORDER BY u.ID ASC${LIMIT ? ' LIMIT ' + LIMIT : ''}`,
    );

    console.log(`Loaded ${wpUsers.length} WP users.`);

    for (const wpUser of wpUsers) {
      scanned++;
      const email = (wpUser.user_email || '').toLowerCase().trim();
      if (!email) { skipped++; continue; }

      // Read capabilities from wp_usermeta (READ-ONLY)
      const [[meta]] = await wp.execute(
        `SELECT meta_value FROM \`${PREFIX}usermeta\` WHERE user_id = ? AND meta_key = ? LIMIT 1`,
        [wpUser.ID, `${PREFIX}capabilities`],
      );
      const capabilitiesRaw = meta?.meta_value || null;
      const devRole = mapWpRole(capabilitiesRaw);

      // Split display_name into first/last
      const nameParts  = (wpUser.display_name || '').trim().split(/\s+/);
      const firstName  = nameParts[0] || '';
      const lastName   = nameParts.slice(1).join(' ') || '';

      if (DRY_RUN) {
        console.log(`  [dry-run] ${email} -> role=${devRole}`);
        continue;
      }

      // Upsert: find by email, then by wp_user_id
      const [[existingRow]] = await dev.query(
        'SELECT id, email, hash, legacy_password_hash FROM users WHERE email = :email LIMIT 1',
        { replacements: { email }, type: dev.QueryTypes.SELECT },
      );

      if (existingRow) {
        // Update legacy fields only — never overwrite an existing bcrypt hash
        await dev.query(
          `UPDATE users SET
             wp_user_id = :wpId,
             wp_roles_raw = :caps,
             role = :role,
             legacy_password_hash = COALESCE(legacy_password_hash, :legacyHash),
             legacy_hash_type     = COALESCE(legacy_hash_type, :hashType),
             updated_at = NOW()
           WHERE id = :id`,
          {
            replacements: {
              wpId:      wpUser.ID,
              caps:      capabilitiesRaw,
              role:      devRole,
              legacyHash: existingRow.hash ? null : wpUser.user_pass,
              hashType:   existingRow.hash ? null : detectHashType(wpUser.user_pass),
              id:        existingRow.id,
            },
          },
        );
        updated++;
      } else {
        // New user — create with legacy hash; no bcrypt hash yet
        await dev.query(
          `INSERT INTO users
             (email, first_name, last_name, role, status, email_verified,
              wp_user_id, legacy_password_hash, legacy_hash_type, wp_roles_raw,
              password_reset_required, default_language, timezone, default_currency,
              email_notifications, marketing_emails, is_online, metadata,
              created_at, updated_at)
           VALUES
             (:email, :firstName, :lastName, :role, 'active', true,
              :wpId, :legacyHash, :hashType, :caps,
              false, 'en', 'UTC', 'USD',
              true, false, false, '{}',
              NOW(), NOW())`,
          {
            replacements: {
              email, firstName, lastName, role: devRole,
              wpId:      wpUser.ID,
              legacyHash: wpUser.user_pass,
              hashType:   detectHashType(wpUser.user_pass),
              caps:      capabilitiesRaw,
            },
          },
        );
        created++;
      }
    }
  } finally {
    await wp.end();
    await dev.close();
  }

  console.log(`\nDone. scanned=${scanned} created=${created} updated=${updated} skipped=${skipped}\n`);
}

function detectHashType(hash) {
  if (!hash) return null;
  if (/^\$[PH]\$/.test(hash)) return 'phpass';
  if (/^[0-9a-f]{32}$/i.test(hash)) return 'md5';
  return null;
}

main().catch((err) => { console.error(err); process.exit(1); });
