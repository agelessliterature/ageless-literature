#!/usr/bin/env node
/**
 * Ageless Literature — Comprehensive API Verification Suite
 * ==========================================================
 * Tests every API endpoint on the dev server and generates TEST_REPORT.md
 *
 * Usage:
 *   node tests/api-verification/run-api-tests.mjs
 *   USE_SSH=false BASE_URL=http://localhost:3001 node tests/api-verification/run-api-tests.mjs
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../..");

// ── Config ──────────────────────────────────────────────────────────────────
function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv(path.join(ROOT, ".env.test"));

const SSH_KEY = process.env.SSH_KEY || "~/.ssh/AgelessLiteratureMasterKey.pem";
const SSH_HOST = process.env.SSH_HOST || "bitnami@3.239.234.232";
const BASE_URL = process.env.BASE_URL || "http://localhost:3001";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "jermaine@agelessliterature.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "password";
const TEST_EMAIL = process.env.TEST_EMAIL || "testrunner@agelessliterature.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "TestRunner123!";
const USE_SSH = process.env.USE_SSH !== "false";

// ── HTTP Helper (via SSH + curl) ────────────────────────────────────────────
function apiCall(method, urlPath, opts = {}) {
  const { body, token, timeout = 15 } = opts;
  const url = `${BASE_URL}${urlPath}`;

  // Build a bash script, base64-encode it, send via SSH to avoid escaping issues
  let script = "";
  if (body) {
    const b64body = Buffer.from(JSON.stringify(body)).toString("base64");
    script += `echo ${b64body} | base64 -d > /tmp/_reqbody.json\n`;
  }
  script += `HTTP_CODE=$(curl -s -o /tmp/_resp.json -w "%{http_code}" --max-time ${timeout} -X ${method}`;
  script += ` -H "Content-Type: application/json"`;
  if (token) script += ` -H "Authorization: Bearer ${token}"`;
  if (body) script += ` -d @/tmp/_reqbody.json`;
  script += ` "${url}")\n`;
  script += `echo "HTTPSTATUS:\${HTTP_CODE}:END"\ncat /tmp/_resp.json 2>/dev/null || echo "{}"\n`;

  const b64script = Buffer.from(script).toString("base64");

  let raw;
  try {
    const sshCmd = USE_SSH
      ? `ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -i ${SSH_KEY} ${SSH_HOST} 'echo ${b64script} | base64 -d | bash'`
      : `echo ${b64script} | base64 -d | bash`;
    raw = execSync(sshCmd, {
      encoding: "utf8",
      timeout: (timeout + 25) * 1000,
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (e) {
    return { status: 0, body: null, error: e.message?.slice(0, 300) || "exec error" };
  }

  const m = raw.match(/HTTPSTATUS:(\d{3}):END/);
  const status = m ? parseInt(m[1]) : 0;
  // Body is everything after the status marker line
  const markerEnd = raw.indexOf(":END", raw.indexOf("HTTPSTATUS:"));
  let bodyStr = (markerEnd >= 0 ? raw.slice(markerEnd + 4) : raw).trim();
  if (!bodyStr) bodyStr = "{}";
  let bodyJson = null;
  try { bodyJson = JSON.parse(bodyStr); } catch { bodyJson = { _raw: bodyStr.slice(0, 500) }; }
  return { status, body: bodyJson, error: null };
}

// ── Auth helpers ────────────────────────────────────────────────────────────
function login(email, pw) {
  const r = apiCall("POST", "/api/auth/login", { body: { email, password: pw } });
  if (r.status === 200 && r.body?.data?.token) return { token: r.body.data.token, user: r.body.data.user };
  return null;
}

function registerUser(email, pw, first = "Test", last = "Runner") {
  const r = apiCall("POST", "/api/auth/register", { body: { email, password: pw, firstName: first, lastName: last } });
  if ((r.status === 201 || r.status === 200) && r.body?.data?.token) return { token: r.body.data.token, user: r.body.data.user };
  return null;
}

// ── Endpoint Inventory ─────────────────────────────────────────────────────
const ts = Date.now();
const ENDPOINTS = [
  // Health
  { method: "GET", path: "/health", auth: false, role: null, expect: 200, desc: "Health check" },

  // Auth
  { method: "POST", path: "/api/auth/register", auth: false, role: null, expect: 201, desc: "Register new user",
    body: { email: `test-${ts}@agelesslit-test.com`, password: "TestPass123!", firstName: "Auto", lastName: "Test" } },
  { method: "POST", path: "/api/auth/login", auth: false, role: null, expect: 200, desc: "Login",
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } },
  { method: "GET", path: "/api/auth/me", auth: true, role: "user", expect: 200, desc: "Get current user" },
  { method: "POST", path: "/api/auth/logout", auth: true, role: "user", expect: 200, desc: "Logout" },

  // Public
  { method: "GET", path: "/api/stats", auth: false, role: null, expect: 200, desc: "Site stats" },
  { method: "GET", path: "/api/books", auth: false, role: null, expect: 200, desc: "List books" },
  { method: "GET", path: "/api/books?limit=1", auth: false, role: null, expect: 200, desc: "List books paginated" },
  { method: "GET", path: "/api/categories", auth: false, role: null, expect: 200, desc: "List categories" },
  { method: "GET", path: "/api/products", auth: false, role: null, expect: 200, desc: "List products" },
  { method: "GET", path: "/api/products/categories", auth: false, role: null, expect: 200, desc: "Product categories" },
  { method: "GET", path: "/api/auctions", auth: false, role: null, expect: 200, desc: "List auctions" },
  { method: "GET", path: "/api/vendors", auth: false, role: null, expect: 200, desc: "List public vendors" },
  { method: "GET", path: "/api/memberships/plans", auth: false, role: null, expect: 200, desc: "Membership plans" },
  { method: "GET", path: "/api/search?q=book", auth: false, role: null, expect: 200, desc: "Search books" },

  // User (auth)
  { method: "GET", path: "/api/users/me", auth: true, role: "user", expect: 200, desc: "Get current user (users)" },
  { method: "GET", path: "/api/users/{userId}", auth: true, role: "user", expect: 200, desc: "Get user by ID", dynamic: true },
  { method: "GET", path: "/api/users/{userId}/stats", auth: true, role: "user", expect: 200, desc: "User stats", dynamic: true },
  { method: "GET", path: "/api/users/{userId}/is-vendor", auth: true, role: "user", expect: 200, desc: "Check is-vendor", dynamic: true },
  { method: "GET", path: "/api/users/{userId}/is-member", auth: true, role: "user", expect: 200, desc: "Check is-member", dynamic: true },
  { method: "GET", path: "/api/users/{userId}/is-admin", auth: true, role: "user", expect: 200, desc: "Check is-admin", dynamic: true },

  // Account
  { method: "GET", path: "/api/account/billing-address", auth: true, role: "user", expect: 200, desc: "Get billing address" },
  { method: "POST", path: "/api/account/billing-address", auth: true, role: "user", expect: 200, desc: "Update billing address",
    body: { fullName: "Test User", addressLine1: "123 Test St", city: "New York", stateProvince: "NY", postalCode: "10001", country: "US" } },
  { method: "GET", path: "/api/account/shipping-address", auth: true, role: "user", expect: 200, desc: "Get shipping address" },
  { method: "POST", path: "/api/account/shipping-address", auth: true, role: "user", expect: 200, desc: "Update shipping address",
    body: { fullName: "Test User", addressLine1: "123 Test St", city: "New York", stateProvince: "NY", postalCode: "10001", country: "US" } },

  // Cart
  { method: "GET", path: "/api/cart", auth: true, role: "user", expect: 200, desc: "Get cart" },
  { method: "DELETE", path: "/api/cart", auth: true, role: "user", expect: 200, desc: "Clear cart" },

  // Wishlist
  { method: "GET", path: "/api/wishlist", auth: true, role: "user", expect: 200, desc: "Get wishlist" },

  // Orders
  { method: "GET", path: "/api/orders", auth: true, role: "user", expect: 200, desc: "List orders" },

  // Reservations
  { method: "GET", path: "/api/reservations", auth: true, role: "user", expect: 200, desc: "Get reservations" },

  // Conversations
  { method: "GET", path: "/api/conversations", auth: true, role: "user", expect: 200, desc: "Get conversations" },

  // Notifications
  { method: "GET", path: "/api/notifications", auth: true, role: "user", expect: 200, desc: "Get notifications" },
  { method: "GET", path: "/api/notifications/unread-count", auth: true, role: "user", expect: 200, desc: "Unread notification count" },

  // Memberships (auth)
  { method: "GET", path: "/api/memberships/subscription", auth: true, role: "user", expect: 200, desc: "User subscription" },
  { method: "GET", path: "/api/memberships/billing-history", auth: true, role: "user", expect: 200, desc: "Billing history" },

  // Bids/Winnings
  { method: "GET", path: "/api/user/bids", auth: true, role: "user", expect: 200, desc: "User bids" },
  { method: "GET", path: "/api/user/bids/active", auth: true, role: "user", expect: 200, desc: "User active bids" },
  { method: "GET", path: "/api/user/winnings", auth: true, role: "user", expect: 200, desc: "User winnings" },

  // Offers
  { method: "GET", path: "/api/users/offers", auth: true, role: "user", expect: 200, desc: "User custom offers" },

  // SMS
  { method: "GET", path: "/api/sms/preferences", auth: true, role: "user", expect: 200, desc: "SMS preferences" },

  // Stripe
  { method: "POST", path: "/api/stripe/setup-intent", auth: true, role: "user", expect: 200, desc: "Create Stripe SetupIntent" },
  { method: "GET", path: "/api/stripe/payment-methods", auth: true, role: "user", expect: 200, desc: "Payment methods (stripe)" },
  { method: "GET", path: "/api/stripe/connect/status", auth: true, role: "user", expect: 200, desc: "Stripe Connect status" },

  // Vendor status
  { method: "GET", path: "/api/vendor/status", auth: true, role: "user", expect: 200, desc: "Vendor status check" },

  // Vendor dashboard (vendor auth)
  { method: "GET", path: "/api/vendor/profile", auth: true, role: "vendor", expect: 200, desc: "Vendor profile" },
  { method: "GET", path: "/api/vendor/dashboard", auth: true, role: "vendor", expect: 200, desc: "Vendor dashboard" },
  { method: "GET", path: "/api/vendor/earnings", auth: true, role: "vendor", expect: 200, desc: "Vendor earnings" },
  { method: "GET", path: "/api/vendor/payouts", auth: true, role: "vendor", expect: 200, desc: "Vendor payouts" },
  { method: "GET", path: "/api/vendor/inventory", auth: true, role: "vendor", expect: 200, desc: "Vendor inventory" },
  { method: "GET", path: "/api/vendor/payout-settings", auth: true, role: "vendor", expect: 200, desc: "Vendor payout settings" },
  { method: "GET", path: "/api/vendor/products", auth: true, role: "vendor", expect: 200, desc: "Vendor products" },
  { method: "GET", path: "/api/vendor/collectibles", auth: true, role: "vendor", expect: 200, desc: "Vendor collectibles" },
  { method: "GET", path: "/api/vendor/collectibles/stats", auth: true, role: "vendor", expect: 200, desc: "Vendor collectible stats" },
  { method: "GET", path: "/api/vendor/orders", auth: true, role: "vendor", expect: 200, desc: "Vendor orders" },
  { method: "GET", path: "/api/vendor/reports/summary", auth: true, role: "vendor", expect: 200, desc: "Vendor reports summary" },
  { method: "GET", path: "/api/vendor/reports/overview", auth: true, role: "vendor", expect: 200, desc: "Vendor reports overview" },
  { method: "GET", path: "/api/vendor/reports/charts", auth: true, role: "vendor", expect: 200, desc: "Vendor report charts" },
  { method: "GET", path: "/api/vendor/reports/products", auth: true, role: "vendor", expect: 200, desc: "Vendor product performance" },
  { method: "GET", path: "/api/vendor/reports/revenue", auth: true, role: "vendor", expect: 200, desc: "Vendor revenue breakdown" },
  { method: "GET", path: "/api/vendor/chat/conversations", auth: true, role: "vendor", expect: 200, desc: "Vendor chat conversations" },
  { method: "GET", path: "/api/vendor/requests", auth: true, role: "vendor", expect: 200, desc: "Vendor requests" },
  { method: "GET", path: "/api/vendor/settings", auth: true, role: "vendor", expect: 200, desc: "Vendor settings" },
  { method: "GET", path: "/api/vendor/offers", auth: true, role: "vendor", expect: 200, desc: "Vendor custom offers" },
  { method: "GET", path: "/api/vendor/withdrawals", auth: true, role: "vendor", expect: 200, desc: "Vendor withdrawals" },

  // Vendor CRUD
  { method: "POST", path: "/api/vendor/products", auth: true, role: "vendor", expect: 201, desc: "Vendor create product",
    body: { title: "Test Book API Suite", author: "Test Author", price: 29.99, condition: "Good", status: "active", description: "Automated test product" },
    saveTo: "vendorProductId" },
  { method: "PUT", path: "/api/vendor/products/{vendorProductId}", auth: true, role: "vendor", expect: 200, desc: "Vendor update product",
    body: { title: "Test Book API Suite UPDATED" }, dynamic: true },
  { method: "DELETE", path: "/api/vendor/products/{vendorProductId}", auth: true, role: "vendor", expect: 200, desc: "Vendor delete product", dynamic: true },

  // Vendor settings update
  { method: "PUT", path: "/api/vendor/settings", auth: true, role: "vendor", expect: 200, desc: "Vendor update settings",
    body: { shopDescription: "Test shop desc — API suite" } },

  // Admin endpoints
  { method: "GET", path: "/api/admin/dashboard", auth: true, role: "admin", expect: 200, desc: "Admin dashboard" },
  { method: "GET", path: "/api/admin/users", auth: true, role: "admin", expect: 200, desc: "Admin list users" },
  { method: "GET", path: "/api/admin/users/stats", auth: true, role: "admin", expect: 200, desc: "Admin user stats" },
  { method: "GET", path: "/api/admin/users/68", auth: true, role: "admin", expect: 200, desc: "Admin get user by ID" },
  { method: "GET", path: "/api/admin/vendors", auth: true, role: "admin", expect: 200, desc: "Admin list vendors" },
  { method: "GET", path: "/api/admin/vendors/stats", auth: true, role: "admin", expect: 200, desc: "Admin vendor stats" },
  { method: "GET", path: "/api/admin/books", auth: true, role: "admin", expect: 200, desc: "Admin list books" },
  { method: "GET", path: "/api/admin/categories", auth: true, role: "admin", expect: 200, desc: "Admin list categories" },
  { method: "GET", path: "/api/admin/orders", auth: true, role: "admin", expect: 200, desc: "Admin list orders" },
  { method: "GET", path: "/api/admin/payouts", auth: true, role: "admin", expect: 200, desc: "Admin list payouts" },
  { method: "GET", path: "/api/admin/payouts/stats", auth: true, role: "admin", expect: 200, desc: "Admin payout stats" },
  { method: "GET", path: "/api/admin/withdrawals", auth: true, role: "admin", expect: 200, desc: "Admin list withdrawals" },
  { method: "GET", path: "/api/admin/memberships/plans", auth: true, role: "admin", expect: 200, desc: "Admin membership plans" },
  { method: "GET", path: "/api/admin/memberships/subscriptions", auth: true, role: "admin", expect: 200, desc: "Admin subscriptions" },
  { method: "GET", path: "/api/admin/products", auth: true, role: "admin", expect: 200, desc: "Admin list products" },
  { method: "GET", path: "/api/admin/products/stats", auth: true, role: "admin", expect: 200, desc: "Admin product stats" },
  { method: "GET", path: "/api/admin/glossary", auth: true, role: "admin", expect: 200, desc: "Admin glossary" },
  { method: "GET", path: "/api/admin/emails", auth: true, role: "admin", expect: 200, desc: "Admin email templates" },

  // Admin CRUD
  { method: "POST", path: "/api/admin/categories", auth: true, role: "admin", expect: [200, 201], desc: "Admin create category",
    body: { name: `Test Cat ${ts}`, slug: `test-cat-${ts}` }, saveTo: "adminCategoryId" },
  { method: "POST", path: "/api/admin/glossary", auth: true, role: "admin", expect: [200, 201], desc: "Admin create glossary",
    body: { term: "Test Term", slug: `test-term-${ts}`, definition: "A test term" }, saveTo: "adminGlossaryId" },
];

// ── Test Runner ─────────────────────────────────────────────────────────────
const results = [];
const ctx = {};

function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  Ageless Literature — API Verification Suite");
  console.log("  Target: " + BASE_URL + (USE_SSH ? ` (via SSH ${SSH_HOST})` : " (direct)"));
  console.log("=".repeat(60) + "\n");

  // Authenticate
  console.log("[Auth] Logging in as admin...");
  const admin = login(ADMIN_EMAIL, ADMIN_PASSWORD);
  if (!admin) { console.error("FATAL: Cannot login as admin. Aborting."); process.exit(1); }
  console.log(`  OK admin (id=${admin.user.id}, role=${admin.user.role})`);
  ctx.adminToken = admin.token;
  ctx.userId = admin.user.id;
  ctx.vendorToken = admin.token;

  console.log("[Auth] Creating test buyer...");
  const buyer = registerUser(TEST_EMAIL, TEST_PASSWORD, "API", "TestRunner") || login(TEST_EMAIL, TEST_PASSWORD);
  if (buyer) {
    ctx.buyerToken = buyer.token;
    ctx.buyerUserId = buyer.user.id;
    console.log(`  OK buyer (id=${buyer.user.id})`);
  } else {
    console.log("  WARN: using admin token as buyer fallback");
    ctx.buyerToken = admin.token;
    ctx.buyerUserId = admin.user.id;
  }

  // Run tests
  console.log("\n[Tests] Running " + ENDPOINTS.length + " endpoint checks...\n");
  let pass = 0, fail = 0, skip = 0;

  for (const ep of ENDPOINTS) {
    let p = ep.path;
    if (ep.dynamic) {
      p = p.replace(/\{(\w+)\}/g, (_, k) => {
        if (ctx[k] !== undefined) return ctx[k];
        if (k === "userId") return ctx.userId;
        return "MISSING";
      });
      if (p.includes("MISSING")) {
        console.log(`  SKIP  ${ep.method.padEnd(7)} ${ep.path.padEnd(52)} -- missing ctx`);
        results.push({ ...ep, resolvedPath: p, status: 0, result: "SKIP", reason: "Missing dynamic context" });
        skip++; continue;
      }
    }

    let token = null;
    if (ep.auth) {
      if (ep.role === "admin") token = ctx.adminToken;
      else if (ep.role === "vendor") token = ctx.vendorToken;
      else token = ctx.buyerToken || ctx.adminToken;
    }

    const body = typeof ep.body === "function" ? ep.body() : ep.body;
    const r = apiCall(ep.method, p, { body, token });
    const expected = Array.isArray(ep.expect) ? ep.expect : [ep.expect];
    const ok = expected.includes(r.status);

    if (ok && ep.saveTo && r.body?.data) {
      const d = r.body.data;
      ctx[ep.saveTo] = d.id || d.data?.id;
    }

    const sym = ok ? "PASS" : "FAIL";
    console.log(`  ${ok?"✅":"❌"} ${sym}  ${ep.method.padEnd(7)} ${p.padEnd(52)} ${String(r.status).padEnd(4)} (expect ${expected.join("|")})  ${ep.desc}`);
    if (!ok) {
      const msg = r.body?.message || r.body?.error || r.error || "";
      if (msg) console.log(`         -> ${String(msg).slice(0, 150)}`);
    }

    results.push({ ...ep, resolvedPath: p, status: r.status, result: ok ? "PASS" : "FAIL",
      reason: ok ? null : (r.body?.message || r.body?.error || r.error || `Got ${r.status}`) });
    if (ok) pass++; else fail++;
  }

  // Cleanup
  console.log("\n[Cleanup]");
  if (ctx.adminCategoryId) {
    apiCall("DELETE", `/api/admin/categories/${ctx.adminCategoryId}`, { token: ctx.adminToken });
    console.log(`  Deleted test category ${ctx.adminCategoryId}`);
  }
  if (ctx.adminGlossaryId) {
    apiCall("DELETE", `/api/admin/glossary/${ctx.adminGlossaryId}`, { token: ctx.adminToken });
    console.log(`  Deleted test glossary ${ctx.adminGlossaryId}`);
  }

  // Report
  console.log("\n[Report] Generating TEST_REPORT.md...");
  writeReport(results, { pass, fail, skip });

  console.log("\n" + "=".repeat(60));
  console.log(`  TOTAL: ${results.length}  |  PASS: ${pass}  |  FAIL: ${fail}  |  SKIP: ${skip}`);
  console.log("=".repeat(60) + "\n");

  process.exit(fail > 0 ? 1 : 0);
}

function writeReport(results, c) {
  const now = new Date().toISOString().slice(0, 19);
  let md = `# Ageless Literature — API Test Report\n\n`;
  md += `**Generated:** ${now}  \n**Target:** ${BASE_URL}  \n`;
  md += `**Total:** ${results.length} | ✅ ${c.pass} pass | ❌ ${c.fail} fail | ⏭️ ${c.skip} skip\n\n`;
  md += `## Endpoint Results\n\n`;
  md += `| Result | Method | Path | Expect | Actual | Auth | Role | Description |\n`;
  md += `|--------|--------|------|--------|--------|------|------|-------------|\n`;
  for (const r of results) {
    const icon = r.result === "PASS" ? "✅" : r.result === "SKIP" ? "⏭️" : "❌";
    const exp = Array.isArray(r.expect) ? r.expect.join("/") : r.expect;
    md += `| ${icon} ${r.result} | ${r.method} | \`${r.resolvedPath || r.path}\` | ${exp} | ${r.status} | ${r.auth?"Y":"N"} | ${r.role||"-"} | ${r.desc} |\n`;
  }

  const failures = results.filter(r => r.result === "FAIL");
  if (failures.length) {
    md += `\n## Failure Details\n\n`;
    for (const f of failures) {
      md += `### ❌ ${f.method} \`${f.resolvedPath || f.path}\`\n\n`;
      md += `- **Desc:** ${f.desc}\n- **Expected:** ${Array.isArray(f.expect)?f.expect.join("/"):f.expect}\n- **Actual:** ${f.status}\n`;
      md += `- **Error:** ${f.reason || "Unknown"}\n`;
      md += `- **Likely Cause:** `;
      if (f.status === 0) md += "Timeout or connection error\n";
      else if (f.status === 401) md += "Auth token invalid or expired\n";
      else if (f.status === 403) md += "Insufficient permissions / role check\n";
      else if (f.status === 404) md += "Route or resource not found\n";
      else if (f.status === 500) md += "Server error — check controller & DB schema\n";
      else md += `Unexpected status ${f.status}\n`;
      md += "\n";
    }
  }

  const rp = path.join(ROOT, "TEST_REPORT.md");
  fs.writeFileSync(rp, md);
  console.log(`  Written to ${rp}`);
}

main();