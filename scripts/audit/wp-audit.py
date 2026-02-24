"""
READ-ONLY audit of the production WordPress MySQL database.
Outputs JSON to stdout. No writes performed.
"""
import pymysql
import json
import sys

conn = pymysql.connect(
    host="ageless-literature-wp-db.mysql.database.azure.com",
    user="AgelessLiterature",
    password="sixqYm-cybpo5-hochuj",
    database="ageless_literature_prod_db",
    ssl={"ssl_disabled": False},
    charset="utf8mb4",
    cursorclass=pymysql.cursors.DictCursor,
)
c = conn.cursor()

def q(sql, args=None):
    if args:
        c.execute(sql, args)
    else:
        c.execute(sql)
    return c.fetchall()

def q1(sql, args=None):
    if args:
        c.execute(sql, args)
    else:
        c.execute(sql)
    r = c.fetchone()
    return list(r.values())[0] if r else 0

result = {}

# ── 1. TABLE INVENTORY ──────────────────────────────────────────────────────
c.execute("SHOW TABLES")
all_tables = [list(r.values())[0] for r in c.fetchall()]
result['all_tables'] = sorted(all_tables)

# Row counts for key tables
key_tables = [
    'wp_posts', 'wp_postmeta', 'wp_users', 'wp_usermeta',
    'wp_comments', 'wp_commentmeta', 'wp_terms', 'wp_term_taxonomy',
    'wp_term_relationships', 'wp_options',
    'wp_woocommerce_order_items', 'wp_woocommerce_order_itemmeta',
    'wp_woocommerce_sessions', 'wp_woocommerce_payment_tokens',
    'wp_woocommerce_shipping_zones', 'wp_woocommerce_shipping_zone_methods',
    'wp_woocommerce_tax_rates',
    'wp_woo_ua_auction_log', 'wp_simple_auction_log',
    'wp_auction_direct_payment', 'wp_auction_hold_payment',
]
counts = {}
for t in key_tables:
    if t in all_tables:
        counts[t] = q1(f"SELECT COUNT(*) FROM {t}")
result['table_counts'] = counts

# ── 2. USERS ─────────────────────────────────────────────────────────────────
result['users_total'] = q1("SELECT COUNT(*) FROM wp_users")

# Roles breakdown via wp_usermeta
roles_raw = q("""
    SELECT meta_value, COUNT(*) as cnt
    FROM wp_usermeta
    WHERE meta_key = 'wp_capabilities'
    GROUP BY meta_value
    ORDER BY cnt DESC
    LIMIT 30
""")
result['user_roles_raw'] = [{'meta_value': r['meta_value'], 'cnt': r['cnt']} for r in roles_raw]

# Top usermeta keys
result['usermeta_top_keys'] = q("""
    SELECT meta_key, COUNT(DISTINCT user_id) as users
    FROM wp_usermeta
    WHERE meta_key NOT LIKE '%session%' AND meta_key NOT LIKE '%transient%'
    GROUP BY meta_key ORDER BY users DESC LIMIT 40
""")

# ── 3. PRODUCTS / POSTS ───────────────────────────────────────────────────────
result['post_type_counts'] = q("""
    SELECT post_type, post_status, COUNT(*) as cnt
    FROM wp_posts
    GROUP BY post_type, post_status
    ORDER BY post_type, cnt DESC
""")

# Product meta keys
result['product_meta_keys'] = q("""
    SELECT pm.meta_key, COUNT(*) as cnt
    FROM wp_postmeta pm
    JOIN wp_posts p ON p.ID = pm.post_id
    WHERE p.post_type = 'product'
      AND pm.meta_key NOT LIKE '\_%thumbnail%'
    GROUP BY pm.meta_key
    ORDER BY cnt DESC
    LIMIT 60
""")

# WooCommerce product taxonomies
result['product_taxonomies'] = q("""
    SELECT tt.taxonomy, COUNT(*) as cnt
    FROM wp_term_taxonomy tt
    GROUP BY tt.taxonomy
    ORDER BY cnt DESC
    LIMIT 30
""")

# Product attribute terms
result['product_attribute_terms'] = q("""
    SELECT tt.taxonomy, t.name
    FROM wp_terms t
    JOIN wp_term_taxonomy tt ON tt.term_id = t.term_id
    WHERE tt.taxonomy LIKE 'pa_%'
    ORDER BY tt.taxonomy LIMIT 50
""")

# ── 4. ORDERS ─────────────────────────────────────────────────────────────────
# WC 7+ uses wp_wc_orders table; older uses wp_posts with post_type='shop_order'
has_wc_orders = 'wp_wc_orders' in all_tables
result['has_wc_orders_table'] = has_wc_orders
if has_wc_orders:
    result['wc_orders_count'] = q1("SELECT COUNT(*) FROM wp_wc_orders")
    result['wc_orders_status'] = q("SELECT status, COUNT(*) as cnt FROM wp_wc_orders GROUP BY status ORDER BY cnt DESC")
    result['wc_orders_meta_keys'] = q("""
        SELECT meta_key, COUNT(*) as cnt FROM wp_wc_orders_meta
        GROUP BY meta_key ORDER BY cnt DESC LIMIT 40
    """) if 'wp_wc_orders_meta' in all_tables else []
else:
    result['shop_order_count'] = q1("SELECT COUNT(*) FROM wp_posts WHERE post_type='shop_order'")
    result['shop_order_status'] = q("""
        SELECT post_status, COUNT(*) as cnt FROM wp_posts
        WHERE post_type='shop_order' GROUP BY post_status ORDER BY cnt DESC
    """)

result['order_items_count'] = counts.get('wp_woocommerce_order_items', 0)
result['order_item_types'] = q("""
    SELECT order_item_type, COUNT(*) as cnt
    FROM wp_woocommerce_order_items
    GROUP BY order_item_type ORDER BY cnt DESC
""") if 'wp_woocommerce_order_items' in all_tables else []

result['order_meta_top_keys'] = q("""
    SELECT meta_key, COUNT(*) as cnt
    FROM wp_woocommerce_order_itemmeta
    GROUP BY meta_key ORDER BY cnt DESC LIMIT 40
""") if 'wp_woocommerce_order_itemmeta' in all_tables else []

# Payment meta (look for Stripe/PayPal references in postmeta or wc_orders_meta)
result['payment_meta_keys'] = q("""
    SELECT meta_key, COUNT(*) as cnt
    FROM wp_postmeta
    WHERE (meta_key LIKE '%stripe%' OR meta_key LIKE '%paypal%'
           OR meta_key LIKE '%payment%' OR meta_key LIKE '%transaction%'
           OR meta_key LIKE '%charge%' OR meta_key LIKE '%intent%')
    GROUP BY meta_key ORDER BY cnt DESC LIMIT 30
""")

# ── 5. VENDORS ────────────────────────────────────────────────────────────────
# Detect vendor plugin tables
vendor_tables = [t for t in all_tables if any(x in t.lower() for x in ['dokan','wcv','vendor','seller'])]
result['vendor_tables'] = vendor_tables

# Check wp_options for vendor plugin settings
result['vendor_plugin_options'] = q("""
    SELECT option_name, SUBSTRING(option_value, 1, 120) as option_preview
    FROM wp_options
    WHERE option_name LIKE '%dokan%' OR option_name LIKE '%wcv%'
       OR option_name LIKE '%vendor%' OR option_name LIKE '%seller%'
       OR option_name LIKE '%commission%' OR option_name LIKE '%wcfm%'
    ORDER BY option_name LIMIT 30
""")

# Vendor usermeta keys
result['vendor_usermeta_keys'] = q("""
    SELECT meta_key, COUNT(DISTINCT user_id) as cnt
    FROM wp_usermeta
    WHERE meta_key LIKE '%vendor%' OR meta_key LIKE '%seller%'
       OR meta_key LIKE '%dokan%' OR meta_key LIKE '%store%'
       OR meta_key LIKE '%commission%' OR meta_key LIKE '%withdraw%'
       OR meta_key LIKE '%payout%' OR meta_key LIKE '%stripe%'
    GROUP BY meta_key ORDER BY cnt DESC LIMIT 40
""")

# ── 6. AUCTIONS ───────────────────────────────────────────────────────────────
result['auction_meta_keys'] = q("""
    SELECT pm.meta_key, COUNT(*) as cnt
    FROM wp_postmeta pm
    JOIN wp_posts p ON p.ID = pm.post_id
    WHERE pm.meta_key LIKE '%auction%' OR pm.meta_key LIKE '%woo_ua%' OR pm.meta_key LIKE '%bid%'
    GROUP BY pm.meta_key ORDER BY cnt DESC LIMIT 40
""")

result['auction_product_counts'] = q("""
    SELECT post_status, COUNT(*) as cnt
    FROM wp_posts p
    JOIN wp_postmeta pm ON pm.post_id = p.ID
    WHERE pm.meta_key = 'woo_ua_auction_type' AND p.post_type = 'product'
    GROUP BY post_status ORDER BY cnt DESC
""")

result['auction_bid_log_count'] = counts.get('wp_woo_ua_auction_log', 0)
result['auction_bid_log_sample'] = q("SELECT * FROM wp_woo_ua_auction_log ORDER BY id DESC LIMIT 3") if 'wp_woo_ua_auction_log' in all_tables else []

result['auction_direct_payment_count'] = counts.get('wp_auction_direct_payment', 0)
result['auction_direct_payment_cols'] = q("DESCRIBE wp_auction_direct_payment") if 'wp_auction_direct_payment' in all_tables else []
result['auction_hold_payment_cols'] = q("DESCRIBE wp_auction_hold_payment") if 'wp_auction_hold_payment' in all_tables else []

if 'wp_auction_direct_payment' in all_tables:
    result['auction_direct_payment_sample'] = q("SELECT * FROM wp_auction_direct_payment LIMIT 3")
if 'wp_auction_hold_payment' in all_tables:
    result['auction_hold_payment_sample'] = q("SELECT * FROM wp_auction_hold_payment LIMIT 3")

# ── 7. MEDIA / ATTACHMENTS ────────────────────────────────────────────────────
result['attachment_count'] = q1("SELECT COUNT(*) FROM wp_posts WHERE post_type='attachment'")
result['attachment_meta_keys'] = q("""
    SELECT pm.meta_key, COUNT(*) as cnt
    FROM wp_postmeta pm
    JOIN wp_posts p ON p.ID = pm.post_id
    WHERE p.post_type = 'attachment'
    GROUP BY pm.meta_key ORDER BY cnt DESC LIMIT 10
""")

# ── 8. SHIPPING ───────────────────────────────────────────────────────────────
result['shipping_zones'] = q("SELECT * FROM wp_woocommerce_shipping_zones") if 'wp_woocommerce_shipping_zones' in all_tables else []
result['shipping_methods'] = q("SELECT * FROM wp_woocommerce_shipping_zone_methods") if 'wp_woocommerce_shipping_zone_methods' in all_tables else []
result['shipping_meta_keys'] = q("""
    SELECT meta_key, COUNT(*) as cnt FROM wp_postmeta
    WHERE meta_key LIKE '%shipping%' OR meta_key LIKE '%tracking%' OR meta_key LIKE '%carrier%'
    GROUP BY meta_key ORDER BY cnt DESC LIMIT 20
""")

# ── 9. COUPONS / DISCOUNTS ────────────────────────────────────────────────────
result['coupon_count'] = q1("SELECT COUNT(*) FROM wp_posts WHERE post_type='shop_coupon'")
result['coupon_meta_keys'] = q("""
    SELECT pm.meta_key, COUNT(*) as cnt FROM wp_postmeta pm
    JOIN wp_posts p ON p.ID = pm.post_id WHERE p.post_type='shop_coupon'
    GROUP BY pm.meta_key ORDER BY cnt DESC LIMIT 20
""")

# ── 10. WP OPTIONS (site config) ──────────────────────────────────────────────
result['active_plugins'] = q1("SELECT option_value FROM wp_options WHERE option_name='active_plugins'")
result['wc_version'] = q1("SELECT option_value FROM wp_options WHERE option_name='woocommerce_version'")
result['blog_name'] = q1("SELECT option_value FROM wp_options WHERE option_name='blogname'")
result['gateways_enabled'] = q("""
    SELECT option_name, SUBSTRING(option_value,1,200) as val FROM wp_options
    WHERE option_name LIKE 'woocommerce_%_settings' AND option_value LIKE '%enabled%'
    LIMIT 20
""")
result['wp_options_count'] = q1("SELECT COUNT(*) FROM wp_options")
result['wc_options_count'] = q1("SELECT COUNT(*) FROM wp_options WHERE option_name LIKE 'woocommerce_%'")

# ── 11. PAYOUT / EARNINGS ─────────────────────────────────────────────────────
payout_tables = [t for t in all_tables if any(x in t.lower() for x in ['payout','earning','commission','withdraw','balance'])]
result['payout_tables'] = payout_tables
for pt in payout_tables:
    result[f'payout_{pt}_count'] = q1(f"SELECT COUNT(*) FROM {pt}")
    result[f'payout_{pt}_cols'] = q(f"DESCRIBE {pt}")

# ── 12. EMAIL / NOTIFICATION LOGS ─────────────────────────────────────────────
log_tables = [t for t in all_tables if any(x in t.lower() for x in ['log','email','notification','event'])]
result['log_tables'] = log_tables
for lt in log_tables:
    try:
        result[f'log_{lt}_count'] = q1(f"SELECT COUNT(*) FROM {lt}")
    except:
        pass

conn.close()

print(json.dumps(result, default=str, indent=2))
sys.stderr.write("WP audit complete\n")
