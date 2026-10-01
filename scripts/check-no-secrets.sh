#!/usr/bin/env bash
# Fails if tracked files (or dist/) contain secrets or VITE_ leaks in functions.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== check-no-secrets =="

# 1. Tracked files must never contain service-role JWTs or real secret VALUES.
#    (Env var NAMES like R2_SECRET_ACCESS_KEY are fine; values are not.)
if git grep -n -E "SERVICE_ROLE.{0,30}eyJ[A-Za-z0-9_-]{10,}" -- . ':!package-lock.json' ; then
  echo "FAIL: service-role JWT found in tracked files."
  exit 1
fi
if git grep -n -E "R2_SECRET_ACCESS_KEY\s*=\s*['\"]?[A-Za-z0-9/+=]{20,}" -- . ':!package-lock.json' | grep -v -E "YOUR_|EXAMPLE|PLACEHOLDER|YOUR_R2" ; then
  echo "FAIL: R2 secret value found in tracked files."
  exit 1
fi
if git grep -n -E "BEGIN [A-Z ]*PRIVATE KEY" -- . ; then
  echo "FAIL: private key found in tracked files."
  exit 1
fi

# 2. Tracked .env files: only .env.example may exist.
tracked_env=$(git ls-files | grep -E '^\.env' || true)
if [ -n "$tracked_env" ] && [ "$tracked_env" != ".env.example" ]; then
  echo "FAIL: tracked .env files other than .env.example:"
  echo "$tracked_env"
  exit 1
fi

# 3. Netlify functions must not reference VITE_ vars (would leak to browser).
if grep -rn "VITE_" netlify/functions --include='*.mjs' --include='*.js' ; then
  echo "FAIL: VITE_ reference inside netlify/functions."
  exit 1
fi

# 4. Built bundle must not contain server-only keys.
if [ -d dist ]; then
  if grep -r -i -E "SERVICE_ROLE|R2_SECRET_ACCESS_KEY" dist 2>/dev/null ; then
    echo "FAIL: server secret found in dist/."
    exit 1
  fi
fi

echo "OK: no secrets detected."
