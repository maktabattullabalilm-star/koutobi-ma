# 29. PWA / offline + cart robustness (cross-tab, versioning)

- **Status:** **done**
- **Done 2026-09-22:** `vite-plugin-pwa` (generateSW, autoUpdate) — precache shell, `CacheFirst` R2 covers (immutable, 200/30d), `NetworkFirst` Supabase GETs (5s timeout, 5min); orders POSTs never cached; `/api/*` + `/admin/*` excluded from nav fallback; hand-made `manifest.webmanifest` (ar/RTL, standalone) + generated 192/512/maskable PNGs from the brand SVG + apple-touch link; Checkout `navigator.onLine` guard (Arabic); cart v2 (`{version:2,items}`, sanitized, v1 one-time migration + drop, `storage`-event cross-tab sync — all tested incl. malformed/corrupt cases).
- **Size:** M
- **Depends on:** 17, 19 (manifest/icons)
- **Severity:** UX medium

## Goal

Installable, loads offline shell, COD flow degrades gracefully without network. Cart never corrupts across tabs/versions.

## Findings

- No `manifest.webmanifest`, no `vite-plugin-pwa/workbox`, no SW, no `theme-color`, no 192/512 icons. Cart persists `localStorage` but app won't load offline. `Checkout.jsx:34-66` no `navigator.onLine` guard / retry queue.
- `CartContext.jsx:6-70` lightweight + memoized (good) but no `storage`-event sync, no version migration, `setQty` clamps to snapshot `stock ??99` not live stock (partially mitigated by `Checkout` re-check + warning `:143-153`).

## Spec / acceptance criteria

- [ ] `vite-plugin-pwa` (Workbox, `display=standalone`, `dir=rtl`, `lang=ar`, icons 192/512 maskable from 19); precache shell, runtime-cache R2 covers (`CacheFirst`) + Supabase GET (`NetworkFirst`); `theme-color` meta.
- [ ] Offline UX: `navigator.onLine` guard + queued retry message in Checkout (Arabic), cart survives reload offline, no generic `تعذّر` dead-end.
- [ ] Cart v2: `STORAGE_KEY=koutobi_cart_v2` with `{version:2, items}` + migration from v1 + `window.addEventListener('storage')` cross-tab sync + live-stock revalidate hook (21) on focus.
- [ ] Lighthouse PWA installable; e2e offline test (playwright `context.setOffline`).

## Touches

- `vite.config.js`, `public/manifest/*`, `src/context/CartContext.jsx`, `src/pages/Checkout.jsx`, `Cart.jsx`, `src/main.jsx` (SW register).

## Risks / notes

- SW caching Supabase can serve stale prices — `NetworkFirst` + short TTL only; never cache orders POST.
