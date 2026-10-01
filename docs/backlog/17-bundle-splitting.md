# 17. Bundle splitting + lazy routes (stop shipping admin to storefront)

- **Status:** **done**
- **Done 2026-09-22:** all 17 routes `React.lazy` + Arabic `<Suspense>` fallback; `manualChunks` (vendor-react/supabase/radix + admin). Result: storefront chunks 3–10KB each, admin 144KB separate (was: single 699KB/207-gzip chunk incl. 948-line BookForm on first paint). `NotFound` already extracted in 21. `brotli` plugin skipped (Netlify compresses at edge); visualizer skipped (build output is the budget proof).
- **Size:** M
- **Depends on:** 21 (ProtectedRoute/Suspense shell)
- **Severity:** perf high

## Goal

First paint downloads storefront only. Admin (`BookForm` 948 lines, Dashboard, R2 code) loads on `/admin/*` demand.

## Findings

- `src/App.jsx:1-19` statically imports all 14 routes; `BookForm/Dashboard/BooksAdmin/OrdersAdmin/CatalogData/Settings` in initial chunk.
- `vite.config.js:16-19` no `manualChunks`, no `assetsInlineLimit/cssCodeSplit`, no brotli/gzip plugin, no visualizer. `index.css:1-3` global Tailwind for all routes. `radix-ui/lucide/supabase-js` in main bundle (`@aws-sdk/client-s3` correctly server-only).

## Spec / acceptance criteria

- [ ] `React.lazy(()=>import('./pages/...'))` for all routes + `<Suspense fallback>` + separate `admin` chunk; `NotFound` moved to `pages/NotFound.jsx` (today inline `App.jsx:22-33`).
- [ ] `vite.config.js`: `manualChunks {vendor-react, vendor-supabase, vendor-radix, admin, storefront}`, `assetsInlineLimit`, `cssCodeSplit:true`, `vite-plugin-compression` (brotli+gzip), `rollup-plugin-visualizer` budget check in CI (initial JS <250KB gzip storefront).
- [ ] Verify: `npm run build -- --report`, storefront `/` loads 0 admin bytes; Lighthouse performance +15pts min.

## Touches

- `src/App.jsx`, `vite.config.js`, `package.json`, `src/pages/NotFound.jsx` (new).

## Risks / notes

- Lazy can flash skeletons — keep skeletons per route, preload on link hover.
