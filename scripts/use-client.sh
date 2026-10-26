#!/usr/bin/env bash
# Point local Vite dev/build at one client by linking .env.local to its env file.
#
#   scripts/use-client.sh <slug> [--force]
#
# Vite loads .env.local after .env, so the client's values win. The link is
# gitignored. To load the same values into your shell for CLI commands:
#   eval "$(scripts/client-env.sh <slug> exports)"
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
slug="${1:-}"
force="${2:-}"

if [ -z "$slug" ]; then
  echo "usage: $0 <slug> [--force]" >&2
  exit 2
fi

envfile="$("$root/scripts/client-env.sh" "$slug" path)"
target="$root/.env.local"

if [ -e "$target" ] && [ ! -L "$target" ] && [ "$force" != "--force" ]; then
  echo "refusing to overwrite real file: $target (move it, or pass --force)" >&2
  exit 1
fi

ln -sfn "$envfile" "$target"
echo "active client: $slug"
echo "linked: $target -> $envfile"
"$root/scripts/client-env.sh" "$slug" summary
