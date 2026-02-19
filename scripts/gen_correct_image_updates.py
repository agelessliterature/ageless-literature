#!/usr/bin/env python3
"""
Generate correct PostgreSQL UPDATE statements for book_media.imageUrl
by looking up each book's correct WordPress attachment files via wp_post_id.
"""
import json
import subprocess
import sys
from collections import defaultdict

MYSQL_CMD = [
    "mysql",
    "-h", "ageless-literature-wp-db.mysql.database.azure.com",
    "-u", "AgelessLiterature",
    "-psixqYm-cybpo5-hochuj",
    "ageless_literature_prod_db",
    "--batch", "--skip-column-names"
]
BASE_URL = "https://www.agelessliterature.com/wp-content/uploads/"

def run_mysql(sql):
    result = subprocess.run(
        MYSQL_CMD + ["-e", sql],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        print("MySQL error:", result.stderr[:200], file=sys.stderr)
        return []
    rows = []
    for line in result.stdout.strip().split("\n"):
        if line:
            rows.append(line.split("\t"))
    return rows

print("Loading book_media_map.json...", file=sys.stderr)
with open("/tmp/book_media_map.json") as f:
    rows = json.load(f)

# Group book_media rows by wp_post_id  
# wp_post_id_groups: { wp_post_id: [(media_id, displayOrder, isPrimary), ...] }
wp_post_id_groups = defaultdict(list)
for row in rows:
    wp_id = str(row["wp_post_id"])
    wp_post_id_groups[wp_id].append((str(row["media_id"]), int(row["displayOrder"]), row["isPrimary"]))

all_wp_ids = list(wp_post_id_groups.keys())
print(f"Unique wp_post_ids: {len(all_wp_ids)}", file=sys.stderr)

# For each wp_post_id, get _thumbnail_id and _product_image_gallery
# Process in batches of 2000
BATCH = 2000
# wp_media_map: { wp_post_id: { 0: attach_id_primary, 1: attach_id, 2: ... } }
wp_media_map = {}  # wp_post_id => list of attachment IDs in order [primary, gallery...]

for i in range(0, len(all_wp_ids), BATCH):
    batch = all_wp_ids[i:i+BATCH]
    ids_str = ",".join(batch)
    sql = f"""SELECT post_id, meta_key, meta_value 
              FROM wp_postmeta 
              WHERE post_id IN ({ids_str}) 
              AND meta_key IN ('_thumbnail_id', '_product_image_gallery')"""
    qrows = run_mysql(sql)
    
    # Parse into per-post data
    post_data = defaultdict(dict)
    for qrow in qrows:
        if len(qrow) == 3:
            post_id, meta_key, meta_value = qrow
            post_data[post_id][meta_key] = meta_value
    
    for post_id, meta in post_data.items():
        attach_ids = []
        thumb = meta.get("_thumbnail_id", "").strip()
        gallery = meta.get("_product_image_gallery", "").strip()
        
        if thumb:
            attach_ids.append(thumb)
        if gallery:
            for gid in gallery.split(","):
                gid = gid.strip()
                if gid and gid != thumb:
                    attach_ids.append(gid)
        
        if attach_ids:
            wp_media_map[post_id] = attach_ids
    
    print(f"  Processed batch {i//BATCH + 1}/{(len(all_wp_ids)+BATCH-1)//BATCH}", file=sys.stderr)

# Now get all attachment file paths  
all_attach_ids = set()
for ids in wp_media_map.values():
    all_attach_ids.update(ids)

print(f"Total unique attachment IDs: {len(all_attach_ids)}", file=sys.stderr)

# attach_paths: { attach_id: file_path }
attach_paths = {}
all_attach_list = list(all_attach_ids)

for i in range(0, len(all_attach_list), BATCH):
    batch = all_attach_list[i:i+BATCH]
    ids_str = ",".join(batch)
    sql = f"""SELECT post_id, meta_value 
              FROM wp_postmeta 
              WHERE post_id IN ({ids_str}) 
              AND meta_key = '_wp_attached_file'"""
    qrows = run_mysql(sql)
    for qrow in qrows:
        if len(qrow) == 2:
            attach_paths[qrow[0]] = qrow[1]
    
    print(f"  File paths batch {i//BATCH + 1}/{(len(all_attach_list)+BATCH-1)//BATCH}", file=sys.stderr)

print(f"Attachment paths found: {len(attach_paths)}", file=sys.stderr)

# Generate UPDATE statements
updates = []
skipped = 0
for wp_id, media_rows in wp_post_id_groups.items():
    attach_ids = wp_media_map.get(wp_id)
    if not attach_ids:
        skipped += 1
        continue
    
    # Sort media_rows by displayOrder
    media_rows_sorted = sorted(media_rows, key=lambda x: x[1])
    
    for idx, (media_id, display_order, is_primary) in enumerate(media_rows_sorted):
        if idx < len(attach_ids):
            attach_id = attach_ids[idx]
            file_path = attach_paths.get(attach_id)
            if file_path:
                image_url = BASE_URL + file_path
                # Escape single quotes
                image_url_esc = image_url.replace("'", "''")
                updates.append(f"UPDATE book_media SET \"imageUrl\"='{image_url_esc}', \"thumbnailUrl\"=NULL WHERE id={media_id};")
        else:
            # More book_media rows than WP images — leave as is
            skipped += 1

print(f"Generated {len(updates)} UPDATE statements. Skipped: {skipped}", file=sys.stderr)

out_file = "/tmp/correct_image_updates.sql"
with open(out_file, "w") as f:
    f.write("\n".join(updates) + "\n")

print(f"Written to {out_file}", file=sys.stderr)
print(f"DONE: {len(updates)} statements")
