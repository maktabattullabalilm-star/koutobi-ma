# 28. Accessibility pass (forms, focus, contrast, RTL, touch)

- **Status:** **done**
- **Done 2026-09-22:** skip-link + `main#main-content` + focus-to-h1 on route change; search `role` + labels (desktop + drawer); checkout `autocomplete/inputmode/required/aria-invalid/describedby` (shadcn styles invalid automatically); toast `role=status` + 5s errors + hidden icon; breadcrumb `nav/ol/li` semantics; all lucide icons `aria-hidden` by default + custom SVGs hidden; danger `#d64545→#b91c1c` (4.0→5.9:1) + `gray-400→500` text sweep; logical props (`start/end`) for badges/float/close; cart 44px targets + named labels + `aria-live` qty/total; `motion-reduce` on ping; sort `labelledby`.
- **Verified as-is:** `Sheet side="right"` (physical drawer, fine in RTL), focus rings (custom `.input` + shadcn `focus-visible` + `aria-invalid` styles).
- **Follow-up:** axe-core CI (needs playwright/browser env — tracked).
- **Size:** M
- **Depends on:** 06-responsiveness (touch/RTL verified together), 25 (Toast fix)
- **Severity:** a11y medium-high

## Goal

Screen-reader + keyboard + low-vision usable in Arabic RTL. No new a11y debt.

## Findings

- Forms: search inputs no label (`Header.jsx:57-62,116-121`, no `role=search`); `Checkout.jsx:68-80` good `htmlFor/id` but missing `autocomplete/name/tel/street-address`, `inputmode=tel`, `required`, `aria-invalid/describedby` (FieldError has `role=alert ui/field.tsx:217` but unlinked); `Catalog.jsx:113` label wraps Select without `htmlFor`.
- Feedback/focus: `Toast.jsx:23-31` no `role=status/aria-live`, icon no `aria-hidden`, 2600ms too short; no skip-link, `StoreLayout.jsx:13 <main>` no `id`; `ScrollToTop.jsx:7 instant` never moves focus; breadcrumb (`BookDetail.jsx:103-113`) no `aria-label/ol/li`, separators not hidden; stars/icons (`Home.jsx:236`, `icons.jsx`) missing `aria-hidden`.
- Contrast: `white on #d64545` ~3.9:1 (`ProductCard.jsx:27`, `BookDetail.jsx:121`, `index.css:21 danger`), `text-gray-400 on white` ~2.9:1 (`Catalog.jsx:164`, `Footer.jsx:91`) fail AA 4.5; brand `#35724e` passes — keep.
- RTL: physical `left/right` (`ProductCard.jsx:27,31`, `WhatsAppFloat.jsx:11`, `AnnouncementBar.jsx:39`) should be `start/end`; `Sheet side="right"` verify in RTL; `index.css:74 .input outline-hidden` verify `focus-visible` ring.
- Touch: `Cart.jsx:60-68` qty buttons ~36px <44px, remove `p-1.5` small, no `aria-live` for qty/total.

## Spec / acceptance criteria

- [ ] Labels + `role=search` + `autocomplete/inputmode/required/aria-*` on all forms; `aria-describedby` links `Input→FieldError`.
- [ ] Skip-link + `main#main` + focus-to-`h1` on route change; toast `role=status aria-live=polite` 5s + error tone; breadcrumb semantics; `aria-hidden` on decorative SVGs; `motion-reduce:animate-none` on `WhatsAppFloat ping`.
- [ ] Contrast: darken `danger` to ≥4.5:1 with white, replace `gray-400` on white with `gray-500+`; verify with axe + Lighthouse a11y 100.
- [ ] RTL: `start/end` logical props everywhere; touch targets ≥44px; `aria-live` on cart totals.
- [ ] CI: `axe-core` on Home/Catalog/Detail/Cart/Checkout + admin login.

## Touches

- `src/components/*`, `src/pages/*`, `src/index.css`, `src/components/ui/*`, `StoreLayout.jsx`, `ScrollToTop.jsx`.

## Risks / notes

- Color change affects brand — get owner sign-off on darkened danger swatch.
