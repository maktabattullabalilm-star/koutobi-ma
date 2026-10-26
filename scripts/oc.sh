#!/usr/bin/env bash
# Launch OpenCode with one client's env loaded, so MCP targets that client.
#
#   scripts/oc.sh <slug> [opencode args...]
#   scripts/oc.sh --default [opencode args...]   # use the repo .env
#
# The tracked .opencode/opencode.json resolves the Supabase MCP URL from
# ${SUPABASE_PROJECT_REF}, which this script exports before starting OpenCode.
# Also loads CLOUDFLARE_* and SUPABASE_ACCESS_TOKEN for MCP/CLI use.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
slug="${1:---default}"
shift || true

if [ "$slug" = "--default" ]; then
  envfile="$root/.env"
  if [ ! -f "$envfile" ]; then
    echo "missing $envfile" >&2
    exit 1
  fi
  set -a
  # shellcheck disable=SC1090
  . "$envfile"
  set +a
else
  eval "$("$root/scripts/client-env.sh" "$slug" exports)"
fi

# Derive the project ref when the env file only has the URL (older .env files).
if [ -z "${SUPABASE_PROJECT_REF:-}" ] && [ -n "${SUPABASE_URL:-}" ]; then
  SUPABASE_PROJECT_REF="$(printf '%s' "$SUPABASE_URL" | sed -E 's#^https?://([^.]+)\..*#\1#')"
  export SUPABASE_PROJECT_REF
fi

if [ -z "${SUPABASE_PROJECT_REF:-}" ]; then
  echo "WARN: SUPABASE_PROJECT_REF not set — Supabase MCP will not be project-scoped." >&2
fi
if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ] || printf '%s' "$SUPABASE_ACCESS_TOKEN" | grep -q '^sbp_YOUR'; then
  echo "WARN: SUPABASE_ACCESS_TOKEN is missing — Supabase MCP will fail to authenticate." >&2
  echo "      Create a PAT at https://supabase.com/dashboard/account/tokens" >&2
fi

echo "OpenCode client: ${CLIENT_SLUG:-default} (supabase: ${SUPABASE_PROJECT_REF:-unset})" >&2
# --standalone gives this process its own server, so {env:...} resolves from
# the env loaded above instead of a shared background server started earlier.
exec opencode --standalone "$@"
