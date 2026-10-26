#!/usr/bin/env bash
# Bootstrap a fresh client database: schema.sql -> migrations (in order) -> seed.
#
#   scripts/setup-client-db.sh <slug> [--with-seed]
#
# Needs SUPABASE_DB_URL in clients/<slug>/.env (Project Settings → Database →
# Connection string → Session pooler). Uses local `psql` if present, otherwise
# runs psql in Docker.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
slug="${1:-}"
with_seed=false
[ "${2:-}" = "--with-seed" ] && with_seed=true

if [ -z "$slug" ]; then
  echo "usage: $0 <slug> [--with-seed]" >&2
  exit 2
fi

eval "$("$root/scripts/client-env.sh" "$slug" exports)"

if [ -z "${SUPABASE_DB_URL:-}" ] || printf '%s' "$SUPABASE_DB_URL" | grep -q 'YOUR_DB_PASSWORD'; then
  echo "FAIL: set SUPABASE_DB_URL in clients/$slug/.env first." >&2
  echo "      Supabase → Project Settings → Database → Connection string → Session pooler." >&2
  exit 1
fi
case "$SUPABASE_DB_URL" in
  *"$SUPABASE_PROJECT_REF"*) ;;
  *) echo "WARN: SUPABASE_DB_URL does not mention $SUPABASE_PROJECT_REF — double-check the project." >&2 ;;
esac

if command -v psql >/dev/null 2>&1; then
  psql_cmd=(psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f -)
elif command -v docker >/dev/null 2>&1; then
  psql_cmd=(docker run --rm -i postgres:16-alpine psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f -)
else
  echo "FAIL: need psql or docker to bootstrap the database." >&2
  exit 1
fi

run_sql() {
  local file="$1"
  echo "== $file"
  "${psql_cmd[@]}" < "$file"
}

run_sql "$root/supabase/schema.sql"
for migration in "$root"/supabase/migrations/*.sql; do
  run_sql "$migration"
done
if $with_seed; then
  run_sql "$root/supabase/seed.sql"
else
  echo "Skipped seed.sql (pass --with-seed to load demo data)."
fi

echo "Database ready for $slug."
echo "Next: configure Auth URLs + first admin in the Supabase dashboard."
