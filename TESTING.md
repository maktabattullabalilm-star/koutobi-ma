# TESTING — local-first workflow

> **Rule: nothing gets pushed to Netlify until explicitly approved.**
> Every feature is proven locally first, using the loop below.
> The local app talks to the live Supabase project (`.env`), so local
> runs are full integration tests — no deploy needed to verify behavior.

## The loop (per feature, in order)

| # | Command | What it proves |
|---|---------|----------------|
| 1 | `npm test` | 46 unit/integration tests green (mocked Supabase, fully offline) |
| 2 | `npm run dev` → http://localhost:5173 | Click-through: catalog → book → cart → checkout → thank-you → `/admin` (real DB rows, zero deploy) |
| 3 | `netlify dev` → http://localhost:8888 | Netlify function `/api/upload-image` runs locally with real env (RLS admin check, R2 upload) |
| 4 | agent-browser on localhost | Scripted E2E catches integration bugs unit tests miss (e.g. the RLS `.select()` checkout failure) |
| 5 | `npm run build` | Deploy gate — same command Netlify runs. Green here = deploy *would* succeed |

Shortcut for steps 1+5:

```bash
npm run test:local   # = npm test && npm run build
```

## Hygiene rules (never pollute the store)

- **Test orders/customers** always use `TEST-` prefixed names
  (e.g. customer `TEST-Smoke`, phone `0600000000`).
- **After each session**, wipe them:
  ```bash
  # paste scripts/cleanup-test-data.sql into Supabase → SQL Editor → Run
  ```
  (`order_items` are removed automatically via `ON DELETE CASCADE`.)
- **R2 test uploads** go to the `covers/_test/` prefix only:
  ```bash
  rclone ls R2:koutobi-ma/covers/_test/          # verify
  rclone delete R2:koutobi-ma/covers/_test/      # clean up
  ```
  (rclone reads credentials from env vars — see below.)
- **Test auth users**: reuse throwaway accounts; remove them via
  Supabase Dashboard → Authentication → Users (SQL cannot delete auth users).
- **Never** test with the real admin account or the burned one-time setup link.

## rclone without a config file

```bash
export RCLONE_CONFIG_R2_TYPE=s3
export RCLONE_CONFIG_R2_PROVIDER=Cloudflare
export RCLONE_CONFIG_R2_ACCESS_KEY_ID=<from .env>
export RCLONE_CONFIG_R2_SECRET_ACCESS_KEY=<from .env>
export RCLONE_CONFIG_R2_ENDPOINT=https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com
rclone --config /dev/null ls R2:koutobi-ma/covers/
```

## Coverage map (no gaps, no deploy needed)

| Concern | Covered locally by |
|---|---|
| UI renders, no JS errors | `dev` + agent-browser |
| Prices / totals / cart math | vitest + dev click-through |
| RLS: guests read books, never orders; admins manage | dev + raw REST probes (`curl` with anon key) |
| Guest order insert (client-UUID, no SELECT) | dev checkout → SQL verify → cleanup script |
| One-time admin claim link | dev + throwaway account (never the burned prod link) |
| Cover upload end-to-end | `netlify dev` + R2 `_test/` prefix |
| Deploy would succeed | `npm run build` |

## What is NOT tested locally

- Netlify edge/CDN behavior and production env vars (verified once per
  deploy, on explicit approval, via the live URL smoke test).
- Real customer WhatsApp/phone confirmation (manual, out of scope).
