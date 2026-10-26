#!/usr/bin/env bash
# Create clients/<slug>/ from templates and (optionally) add the git remote.
#
#   scripts/new-client.sh <slug> "<store name>" <domain> [git-remote-url]
#
# Example:
#   scripts/new-client.sh maktaba "مكتبة الطلاب بالعلم" maktaba.ma \
#     https://github.com/maktabattullabalilm-star/koutobi-ma.git
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
slug="${1:-}"
store_name="${2:-}"
domain="${3:-}"
remote_url="${4:-}"

if [ -z "$slug" ] || [ -z "$store_name" ] || [ -z "$domain" ]; then
  echo "usage: $0 <slug> \"<store name>\" <domain> [git-remote-url]" >&2
  exit 2
fi
if ! printf '%s' "$slug" | grep -Eq '^[a-z0-9][a-z0-9-]*$'; then
  echo "invalid slug: $slug (lowercase letters, digits, dashes)" >&2
  exit 2
fi
if ! printf '%s' "$domain" | grep -Eq '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'; then
  echo "invalid domain: $domain" >&2
  exit 2
fi

dir="$root/clients/$slug"
if [ -e "$dir" ]; then
  echo "already exists: $dir" >&2
  exit 1
fi

mkdir -p "$dir"
chmod 700 "$dir"

node - "$root/templates/client.env.template" "$dir/.env" "$slug" "$domain" <<'NODE'
const fs = require('fs');
const [template, out, slug, domain] = process.argv.slice(2);
const text = fs.readFileSync(template, 'utf8')
  .replaceAll('__SLUG__', slug)
  .replaceAll('__DOMAIN__', domain);
fs.writeFileSync(out, text, { mode: 0o600 });
NODE

node - "$root/templates/client.meta.json" "$dir/meta.json" "$slug" "$store_name" "$domain" <<'NODE'
const fs = require('fs');
const [template, out, slug, storeName, domain] = process.argv.slice(2);
const meta = JSON.parse(fs.readFileSync(template, 'utf8'));
meta.slug = slug;
meta.store_name = storeName;
meta.domain = domain;
meta.github.remote = slug;
if (storeName && !meta.contact.name) meta.contact.name = storeName;
fs.writeFileSync(out, JSON.stringify(meta, null, 2) + '\n', { mode: 0o600 });
NODE

chmod 600 "$dir/.env" "$dir/meta.json"

if [ -n "$remote_url" ]; then
  if git -C "$root" remote get-url "$slug" >/dev/null 2>&1; then
    echo "git remote '$slug' already exists — leaving it unchanged."
  else
    git -C "$root" remote add "$slug" "$remote_url"
    echo "added git remote: $slug -> $remote_url"
  fi
fi

cat <<EOF

Created $dir
  .env        (secrets — chmod 600)
  meta.json   (non-secret record)

Next steps:
  1. Fill clients/$slug/.env (Supabase, Cloudflare, R2, MCP/API tokens).
  2. Fill clients/$slug/meta.json (accounts, plan, billing, notes).
  3. scripts/client-env.sh $slug            # verify the values
  4. scripts/use-client.sh $slug            # point local dev at this client
  5. scripts/deploy.sh $slug                # verify + build + deploy
  6. scripts/clients-list.sh                # see all clients

Onboarding checklist: docs/clients/README.md
EOF
