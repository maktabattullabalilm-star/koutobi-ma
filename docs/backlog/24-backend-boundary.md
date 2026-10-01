# 24. Backend boundary + Netlify shared lib + order transaction

- **Status:** **done**
- **Done 2026-09-22:** `netlify/functions/_lib/{auth,r2,media,fetch-safe,covers}.mjs` — one `requireAdmin`, one `r2Client`, one magic-byte validator, one SSRF guard, one cover downloader; all 4 functions use them (~150 duplicated lines deleted); `POST`-as-delete documented in `delete-image` header (dashboard compat); env split enforced (`check-no-secrets` fails on `VITE_` in functions); order creation atomic via `create_order` RPC (08); size contract commented both sides.
- **Follow-up (not silently dropped):** BookForm gallery orphan-rollback stays client-side + monthly sweep (30) — moving it server-side needs a transactional gallery-sync endpoint, tracked when gallery writes get their own API.
- **Size:** M
- **Depends on:** 08 (order RPC owns transaction), 11, 16
- **Severity:** arch medium

## Goal

Browser never orchestrates multi-step writes; functions share one auth/R2/fetch lib; R2+DB never orphan.

## Findings

- Everything except R2 is direct Supabase from browser (table/column names = API contract). `BookForm.jsx:3-18` does R2 upload + DB writes + orphan rollback `:515-521` client-side; `admin.js:42-71` raw `fetch(UPLOAD_ENDPOINT)` manual auth.
- Netlify auth+R2 boilerplate ×4 (`upload-image.mjs:29-76`, `delete-image.mjs:27-80`, `import-isbn.mjs:23-95`, `import-sifatusafwa.mjs:25-97`); key regex mirrored (`delete-image.mjs:18` vs `images.js:25-27`); `delete-image.mjs:22` accepts `POST` as well as `DELETE` undocumented; client/server size mismatch (`IMAGE_MAX_KB=180` vs `MAX_BYTES=6MB`); `VITE_R2_PUBLIC_URL` reused server-side as fallback.

## Spec / acceptance criteria

- [ ] `netlify/functions/_lib/{auth.js,r2.js,fetch-safe.js,errors.js}`: `requireAdmin(supabase anon+JWT+profiles.role)` (single impl), `r2Client`, `KEY_RE`, `extFromType+magic`, `fetchWithTimeout`, Arabic error map (no `err.message` leak).
- [ ] All 4 functions use `_lib`; document `POST`-as-delete (keep or drop — decide, then OpenAPI comment).
- [ ] Order creation atomic via 08 RPC (two-step insert + N+1 rpc loop removed); BookForm orphan handling moved server-side where possible (transactional gallery sync endpoint or DB trigger cleanup queue).
- [ ] Env split documented: `VITE_*` frontend-only, `R2_*/SUPABASE_*` functions-only; size contract aligned + commented both sides.

## Touches

- `netlify/functions/*`, `src/lib/admin.js`, `src/pages/admin/BookForm.jsx`.

## Risks / notes

- `_lib` bundling with esbuild — verify `node_bundler=esbuild` resolves relative imports.
