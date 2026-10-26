#!/usr/bin/env bash
# Read one client's env file without leaking secrets.
#
#   scripts/client-env.sh <slug> path      -> absolute path to clients/<slug>/.env
#   scripts/client-env.sh <slug> exports   -> shell export lines (eval this)
#   scripts/client-env.sh <slug> summary   -> non-secret human summary (default)
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
slug="${1:-}"
mode="${2:-summary}"

if [ -z "$slug" ]; then
  echo "usage: $0 <slug> [path|exports|summary]" >&2
  exit 2
fi
if ! printf '%s' "$slug" | grep -Eq '^[a-z0-9][a-z0-9-]*$'; then
  echo "invalid slug: $slug (lowercase letters, digits, dashes)" >&2
  exit 2
fi

file="$root/clients/$slug/.env"
if [ ! -f "$file" ]; then
  echo "missing $file" >&2
  echo "create it with: scripts/new-client.sh $slug \"<store name>\" <domain>" >&2
  exit 1
fi

case "$mode" in
  path)
    printf '%s\n' "$file"
    ;;
  exports)
    (
      set -a
      # shellcheck disable=SC1090
      . "$file"
      set +a
      for key in \
        CLIENT_SLUG CLIENT_DOMAIN \
        VITE_SUPABASE_URL VITE_SUPABASE_ANON_KEY VITE_R2_PUBLIC_URL \
        VITE_IMAGE_CDN VITE_ERROR_ENDPOINT \
        SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_PROJECT_REF SUPABASE_ACCESS_TOKEN SUPABASE_DB_URL \
        CLOUDFLARE_ACCOUNT_ID CLOUDFLARE_API_TOKEN CLOUDFLARE_ZONE_ID \
        R2_ACCOUNT_ID R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY R2_BUCKET R2_PUBLIC_URL; do
        if [ -n "${!key+x}" ]; then
          printf 'export %s=%q\n' "$key" "${!key}"
        fi
      done
    )
    ;;
  summary)
    (
      set -a
      # shellcheck disable=SC1090
      . "$file"
      set +a
      remote_url="$(git -C "$root" remote get-url "$slug" 2>/dev/null || true)"
      meta="$root/clients/$slug/meta.json"
      status="?"
      if [ -f "$meta" ]; then
        status="$(node -e 'const m=require(process.argv[1]);process.stdout.write(m.status||"?")' "$meta" 2>/dev/null || echo "?")"
      fi
      clean() {
        case "${1:-}" in
          ''|YOUR_*|sbp_YOUR*|https://YOUR_*|https://pub-X*.r2.dev) printf '—' ;;
          *) printf '%s' "$1" ;;
        esac
      }
      printf 'slug:        %s\n' "${CLIENT_SLUG:-$slug}"
      printf 'status:      %s\n' "$status"
      printf 'domain:      %s\n' "$(clean "${CLIENT_DOMAIN:-}")"
      printf 'supabase:    %s (%s)\n' "$(clean "${SUPABASE_PROJECT_REF:-}")" "$(clean "${SUPABASE_URL:-}")"
      printf 'r2 bucket:   %s\n' "$(clean "${R2_BUCKET:-}")"
      printf 'r2 public:   %s\n' "$(clean "${R2_PUBLIC_URL:-}")"
      printf 'cloudflare:  %s\n' "$(clean "${CLOUDFLARE_ACCOUNT_ID:-}")"
      printf 'git remote:  %s\n' "${remote_url:-— (add one with: git remote add $slug <url>)}"
      printf 'env file:    %s\n' "$file"
    )
    ;;
  *)
    echo "unknown mode: $mode" >&2
    exit 2
    ;;
esac
