# 19. SEO head + sitemap + dynamic titles

- **Status:** **done**
- **Done 2026-09-22:** static head (theme-color, robots, OG type/locale/site_name, twitter card, BookStore JSON-LD) + zero-dep `useHead` (per-route title/OG/canonical from `location.origin` — correct on any deploy incl. previews; restores on unmount; +tests); wired into Home/Catalog(query-aware)/BookDetail(title+desc+cover); `robots.txt` (admin disallowed) + static `sitemap.xml` shell in `public/` (copied to `dist/`).
- **Follow-ups:** absolute-domain sitemap generator incl. `/book/:id` URLs once the production domain is fixed; 192/512 + apple-touch icons with 29 (PWA).
- **Size:** S
- **Depends on:** 17 (per-route chunks can set per-route head)
- **Severity:** perf/SEO medium

## Goal

Shareable book pages with correct titles/covers on WhatsApp/Google.

## Findings

- `index.html:1-20` single title/description, no OG/Twitter/canonical/theme-color/robots/JSON-LD/manifest; only `/favicon.svg` (no 192/512, no apple-touch). `Home/Catalog/BookDetail` never set `document.title`.

## Spec / acceptance criteria

- [ ] `index.html`: OG (`title/description/image/locale ar_MA`), `twitter:card=summary_large_image`, `canonical`, `theme-color`, `robots`, `JSON-LD` (`BookStore` + `ItemList` shell).
- [ ] Per-route head (tiny `useHead` or `react-helmet-async`): `BookDetail` sets `title + meta description + og:image=cover`; Catalog sets query-aware title; reset on unmount.
- [ ] `public/robots.txt + sitemap.xml` (build-time from books) + `manifest.webmanifest` + icons 192/512 maskable + apple-touch.
- [ ] Verify: WhatsApp/FB debugger preview + Lighthouse SEO 100.

## Touches

- `index.html`, `public/*`, `src/pages/BookDetail.jsx`, `Catalog.jsx`, `Home.jsx`, build script for sitemap.

## Risks / notes

- SPA sitemap needs prerender or function-generated XML — start static + books dump script.
