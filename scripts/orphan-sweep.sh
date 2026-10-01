#!/usr/bin/env bash
# Monthly R2 orphan sweep (docs/backlog/30, docs/ops.md).
# Lists R2 keys under covers/ and compares with DB references
# (book_images.r2_key + books.cover_image). Unreferenced keys are
# PRINTED ONLY — pass --delete to remove them after human review.
#
# Required env (never committed):
#   SUPABASE_URL, SUPABASE_SERVICE_KEY (read-only use; prefer a
#     dedicated read-only key), R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
#     R2_SECRET_ACCESS_KEY, R2_BUCKET
# Requires: curl, python3, aws CLI v2.
set -euo pipefail

DELETE=0
[ "${1:-}" = "--delete" ] && DELETE=1

for v in SUPABASE_URL SUPABASE_SERVICE_KEY R2_ACCOUNT_ID R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY R2_BUCKET; do
  [ -n "${!v:-}" ] || { echo "Missing env: $v" >&2; exit 1; }
done

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# 1. DB references (r2_key values + cover_image filenames).
curl -sS "${SUPABASE_URL}/rest/v1/book_images?select=r2_key" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  > "$TMP/db_images.json"
curl -sS "${SUPABASE_URL}/rest/v1/books?select=cover_image" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  > "$TMP/db_books.json"

# 2. R2 listing.
export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
aws --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" \
  s3api list-objects-v2 --bucket "$R2_BUCKET" --prefix "covers/" --output json \
  > "$TMP/r2.json"

# 3. Diff.
python3 - "$TMP" << 'EOF'
import json, sys

tmp = sys.argv[1]
db_keys = set()
for row in json.load(open(f"{tmp}/db_images.json")):
    if row.get("r2_key"):
        db_keys.add(row["r2_key"])
for row in json.load(open(f"{tmp}/db_books.json")):
    url = row.get("cover_image") or ""
    if "/covers/" in url:
        db_keys.add("covers/" + url.split("/covers/")[-1].split("?")[0])

r2_keys = {o["Key"] for o in json.load(open(f"{tmp}/r2.json")).get("Contents", [])}
orphans = sorted(k for k in r2_keys if k not in db_keys)
print(f"R2 objects: {len(r2_keys)} | referenced: {len(r2_keys & db_keys)} | ORPHANS: {len(orphans)}")
for k in orphans:
    print(k)
with open(f"{tmp}/orphans.txt", "w") as f:
    f.write("\n".join(orphans))
EOF

if [ "$DELETE" = "1" ] && [ -s "$TMP/orphans.txt" ]; then
  echo "Deleting $(wc -l < "$TMP/orphans.txt") orphan(s)…"
  while IFS= read -r key; do
    aws --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" \
      s3api delete-object --bucket "$R2_BUCKET" --key "$key" >/dev/null
    echo "deleted: $key"
  done < "$TMP/orphans.txt"
else
  echo "Dry run (no --delete): nothing removed. Review the list above."
fi
