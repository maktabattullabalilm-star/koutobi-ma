# 30. Observability + ops (logs, advisors, error tracking, backups)

- **Status:** **done**
- **Done 2026-09-22:** `lib/report.js` (PII-scrubbed, endpoint-optional, +test) wired into `ErrorBoundary`; `docs/ops.md` (weekly advisors/log checklist with accepted-WARNs, monthly sweep+backup, Netlify alerts, restore runbook); `scripts/orphan-sweep.sh` (dry-run default, `--delete` after review).
- **Size:** S
- **Depends on:** 11, 24 (stable backend first)
- **Severity:** ops medium ("and more")

## Goal

Silent failures (swallowed `catch{}`, best-effort `decrement_stock`, R2 orphans) become visible. Owner gets one dashboard, not console archaeology.

## Findings

- `console.warn` only in `api.js:170`; 4× `console.error` server-only; client swallows (`BookDetail.jsx:37,53`, `Dashboard.jsx:48`, `Settings.jsx:52`, `ThankYou.jsx:16`). No Sentry/PostHog, no log drains, no advisor schedule, no backup/restore doc, no orphan sweep automation (01 notes manual R2-vs-DB diff).

## Spec / acceptance criteria

- [ ] Sentry (or GlitchTip self-host, zero-cost pref) for frontend + functions; `VITE_SENTRY_DSN` frontend-only, server DSN functions-only; source maps uploaded (keep `sourcemap:false` for prod browsers, upload hidden maps to Sentry via plugin).
- [ ] Supabase: weekly advisors (security+performance) review checklist; log-drain or `supabase_query_logs` saved queries (failed `create_order`, RLS denials, `decrement_stock` errors).
- [ ] Netlify: function error alerts (Slack/email), deploy notifications; `scripts/orphan-sweep.sh` (R2 `covers/` vs `book_images.r2_key` + `books.cover_image`) monthly.
- [ ] Backup doc: PITR status, seed restore runbook, `TEST-` cleanup (README conventions) automated.

## Touches

- `package.json`, `vite.config.js` (sentry plugin), `netlify/functions/_lib/errors.js` (24), `scripts/*`, `docs/ops.md` (new).

## Risks / notes

- Sentry adds bundle weight — lazy-init + `tracesSampleRate:0.1`; PII scrub (phone/address) before send.
