# Ops runbook — koutobi-ma (docs/backlog/30)

## Weekly (5 min, Supabase Dashboard)

1. **Advisors:** Database → Advisors → resolve new Security/PERFORMANCE items.
   Known-accepted WARNs (do not "fix" blindly):
   - `anon/authenticated can execute SECURITY DEFINER create_order/decrement_stock/claim_first_admin`
     — intentional public checkout + first-admin flows (qty/phone/rate guards inside).
   - `is_admin/handle_new_user executable` — EXECUTE revoked in migration
     `harden_book_images_and_helper_rpcs`; if the linter still flags them,
     confirm via `select grantee from information_schema.routine_privileges`.
2. **Auth:** Authentication → Users — no unexpected admins; enable
   **Leaked password protection** (Auth → Password protection) if still off.
3. **Logs:** Logs Explorer → saved queries:
   - failed orders: `select * from logs where ... 'create_order'` (rate-limit hits = spam wave?)
   - RLS denials on `books` writes from non-admins.

## Monthly (15 min)

1. **Orphan sweep:** `bash scripts/orphan-sweep.sh` (dry run) → review →
   `bash scripts/orphan-sweep.sh --delete`. Needs the env in the script header.
2. **Backups:** confirm PITR / daily backups enabled (Database → Backups);
   keep one manual snapshot before any migration.
3. **Netlify:** Functions → error rate on `upload-image/delete-image/import-*`;
   set Slack/email deploy + function-error notifications (Site settings).

## Error tracking

- Frontend: `src/lib/report.js` (console-only unless `VITE_ERROR_ENDPOINT`
  is set; PII-scrubbed). `ErrorBoundary` reports render crashes there.
- Upgrade path: point `VITE_ERROR_ENDPOINT` at a Sentry/GlitchTip envelope
  endpoint — no code change needed beyond the receiver.
- Functions: `console.error` in Netlify function logs (alerts above).

## Restore runbook

1. Fresh database: run `supabase/schema.sql`, then the numbered files in
   `supabase/migrations/` in order, then `supabase/seed.sql`. Verify with
   `npm run check:no-secrets`.
   Inventory quantities are changed only through the audited stock RPCs;
   orders reduce stock on `contacted` and restore it on cancellation.
2. Test data: `TEST-` prefixed rows → `scripts/cleanup-test-data.sql`;
   R2 `covers/_test/` objects → delete after verification.
3. Never deploy to Netlify without owner approval (repo convention).
