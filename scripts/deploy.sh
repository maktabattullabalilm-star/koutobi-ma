#!/usr/bin/env bash
# Validate one client's config, then build and deploy it.
#
#   scripts/deploy.sh <slug> [--skip-verify] [--dry-run]
#
# Guards against the classic mistake: building client A but deploying with
# client B's Supabase project / R2 bucket. It also links .env.local so Vite
# bakes the same values that the deploy uses.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
slug="${1:-}"
shift || true
skip_verify=false
dry_run=false
for arg in "$@"; do
  case "$arg" in
    --skip-verify) skip_verify=true ;;
    --dry-run) dry_run=true ;;
    *) echo "unknown option: $arg" >&2; exit 2 ;;
  esac
done

if [ -z "$slug" ]; then
  echo "usage: $0 <slug> [--skip-verify] [--dry-run]" >&2
  exit 2
fi

envfile="$("$root/scripts/client-env.sh" "$slug" path)"
meta="$root/clients/$slug/meta.json"

set -a
# shellcheck disable=SC1090
. "$envfile"
set +a

fail() { echo "FAIL: $*" >&2; exit 1; }
is_placeholder() { printf '%s' "${1:-}" | grep -Eq '^(|YOUR_.*|sbp_YOUR.*|https://YOUR_.*|https://pub-X+\.r2\.dev)$'; }

[ -n "${SUPABASE_PROJECT_REF:-}" ] || fail "SUPABASE_PROJECT_REF is empty in $envfile"
[ -n "${VITE_SUPABASE_URL:-}" ] || fail "VITE_SUPABASE_URL is empty in $envfile"
[ -n "${VITE_SUPABASE_ANON_KEY:-}" ] || fail "VITE_SUPABASE_ANON_KEY is empty in $envfile"
[ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ] || fail "CLOUDFLARE_ACCOUNT_ID is empty in $envfile"
[ -n "${CLOUDFLARE_API_TOKEN:-}" ] || fail "CLOUDFLARE_API_TOKEN is empty in $envfile"
[ -n "${R2_BUCKET:-}" ] || fail "R2_BUCKET is empty in $envfile"
[ -n "${R2_PUBLIC_URL:-}" ] || fail "R2_PUBLIC_URL is empty in $envfile"

for pair in \
  "SUPABASE_PROJECT_REF:$SUPABASE_PROJECT_REF" \
  "CLOUDFLARE_ACCOUNT_ID:$CLOUDFLARE_ACCOUNT_ID" \
  "CLOUDFLARE_API_TOKEN:$CLOUDFLARE_API_TOKEN" \
  "R2_BUCKET:$R2_BUCKET" \
  "R2_PUBLIC_URL:$R2_PUBLIC_URL"; do
  key="${pair%%:*}"
  value="${pair#*:}"
  is_placeholder "$value" && fail "$key still has a placeholder value"
done

case "$VITE_SUPABASE_URL" in
  *"$SUPABASE_PROJECT_REF"*) ;;
  *) fail "VITE_SUPABASE_URL does not match SUPABASE_PROJECT_REF ($SUPABASE_PROJECT_REF)" ;;
esac
case "$R2_PUBLIC_URL" in
  https://*) ;;
  *) fail "R2_PUBLIC_URL must start with https://" ;;
esac

if [ -f "$meta" ]; then
  node - "$meta" "$slug" "$SUPABASE_PROJECT_REF" "${CLIENT_DOMAIN:-}" <<'NODE'
const fs = require('fs');
const [file, slug, ref, domain] = process.argv.slice(2);
const meta = JSON.parse(fs.readFileSync(file, 'utf8'));
const problems = [];
if (meta.slug && meta.slug !== slug) problems.push(`meta.slug=${meta.slug} != ${slug}`);
if (meta.supabase?.project_ref && meta.supabase.project_ref !== ref) {
  problems.push(`meta.supabase.project_ref=${meta.supabase.project_ref} != env ${ref}`);
}
if (meta.domain && domain && meta.domain !== domain) {
  problems.push(`meta.domain=${meta.domain} != env CLIENT_DOMAIN=${domain}`);
}
if (problems.length) {
  console.error('FAIL: meta.json and .env disagree:\n  - ' + problems.join('\n  - '));
  process.exit(1);
}
NODE
else
  echo "WARN: $meta missing — continuing with .env only" >&2
fi

echo "== client: $slug =="
echo "   supabase: $SUPABASE_PROJECT_REF"
echo "   r2:       $R2_BUCKET ($R2_PUBLIC_URL)"
echo "   domain:   ${CLIENT_DOMAIN:-—}"

# Make the build use the same values (Vite reads .env.local after .env).
"$root/scripts/use-client.sh" "$slug" >/dev/null

export CLOUDFLARE_ACCOUNT_ID
export CLOUDFLARE_API_TOKEN
export SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_ACCESS_TOKEN
export R2_ACCOUNT_ID R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY R2_BUCKET R2_PUBLIC_URL
export VITE_SUPABASE_URL VITE_SUPABASE_ANON_KEY VITE_R2_PUBLIC_URL

# Per-client worker config: keep the repo's wrangler.jsonc as the base, but
# bind this client's R2 bucket (and optional WORKER_NAME). Relative paths stay
# valid because the generated file sits at the repo root.
client_config="$root/.wrangler.client.jsonc"
node - "$root/wrangler.jsonc" "$client_config" "$R2_BUCKET" "${WORKER_NAME:-koutobi-ma}" <<'NODE'
const fs = require('fs');
const [source, out, bucket, worker] = process.argv.slice(2);
const config = JSON.parse(fs.readFileSync(source, 'utf8'));
config.name = worker;
if (Array.isArray(config.r2_buckets) && config.r2_buckets.length) {
  config.r2_buckets[0].bucket_name = bucket;
}
fs.writeFileSync(out, JSON.stringify(config, null, 2) + '\n');
console.log(`worker: ${config.name}, bucket: ${bucket}`);
NODE

if $dry_run; then
  echo "DRY RUN: would run 'npm run verify && npm run build && npx wrangler deploy --config .wrangler.client.jsonc' with the env above."
  exit 0
fi

if [ "$skip_verify" = false ]; then
  npm run verify
fi
npm run build
npx wrangler deploy --config "$client_config"

node - "$meta" "$root/package.json" <<'NODE'
const fs = require('fs');
const { execSync } = require('child_process');
const [file, pkgFile] = process.argv.slice(2);
const meta = JSON.parse(fs.readFileSync(file, 'utf8'));
const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
meta.deploy = meta.deploy || {};
meta.deploy.last_version = pkg.version;
try {
  meta.deploy.last_commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
} catch {}
meta.deploy.last_deployed_at = new Date().toISOString().slice(0, 10);
fs.writeFileSync(file, JSON.stringify(meta, null, 2) + '\n', { mode: 0o600 });
NODE

echo "Deployed $slug. Remember to push the matching code to its git remote:"
echo "  git push $slug main"
