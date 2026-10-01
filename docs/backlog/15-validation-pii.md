# 15. Input validation + PII + error hygiene (Checkout/BookForm/Admin)

- **Status:** **done**
- **Done 2026-09-22:** shared `src/lib/validators.js` (+13 tests) used by Checkout + BookForm — MA phone, lengths mirroring server CHECKs, int guards (no `NaN`), ISBN-on-save, https-only cover URLs; Checkout `maxLength`s; ThankYou clears `sessionStorage` PII + drops duplicate `scrollTo`; OrdersAdmin masked phones with reveal toggle + sanitized `tel:` + sequential `طلب #N` (no short-UUID) + `noopener`; all 4 functions return generic Arabic 500s (detail stays server-side).
- **Deferred to 21:** `lib/admin.js` `show(err.message)` → centralized `apiClient` error map; zod migration judged unnecessary (handwritten validators + tests, zero bundle cost).
- **Size:** M
- **Depends on:** 08 (server CHECKs), 11 (DB constraints)
- **Severity:** medium (M3/M4/M6) + low (L1/L6)

## Goal

Client + DB validate everything; PII minimized/masked; DB internals never leak to UI.

## Findings

- `Checkout.jsx:26-32` only `name>=3`, `phone=/^[0-9+\s-]{9,15}$/` (allows `+++++++++++`), `address>=8`; `city/notes/items` unbounded → `text` DoS / stored payload (React escaping saves XSS, but `OrdersAdmin.jsx:109-139` renders PII). Bypassable via direct INSERT (08).
- `sessionStorage koutobi_last_order:{id,total,name,phone,demo} :50-53` never cleared; `localStorage koutobi_cart_v1` no schema version (though try/catch ok).
- `BookForm.jsx:402-414` only `title_ar`, `price>=0`, `old_price>price`; `category` required in UI `:621` but not validated; `pages/stock_qty` `Number('abc')→NaN` → DB error leak; `isbn` only checked on import; `cover_image/url` (`addUrlImage:281` only `^https?://`) allows any host / `http://` mixed-content/tracker.
- `tel:${o.phone}` (`OrdersAdmin.jsx:110`) unsanitized; `rel="noreferrer"` without `noopener` (`Checkout.jsx:175`, `ThankYou.jsx:62`); `#{o.id.slice(0,8)}` leaks partial UUID.
- `show(err.message)` everywhere (`admin.js`, `BookForm.jsx:522`) + functions `catch→err.message` leak DB/R2 internals.

## Spec / acceptance criteria

- [ ] Shared `zod` schemas `src/lib/validators.ts`: order (name 3..100, phone E.164-MA `^\+?212[5-7]\d{8}$|^0[5-7]\d{8}$`, address 8..500, city 2..100, notes ≤1000, items 1..20), book (category ∈ DB list, price 0..99999, pages 0..10000 int, stock 0..9999 int, isbn valid-or-empty, url https + allowlist R2/trusted CDN ≤2048).
- [ ] Mirror as DB `CHECK`s (11/08); client shows Arabic mapped errors, never raw `err.message` (generic Arabic + `console`/server log detail).
- [ ] PII: `sessionStorage.removeItem` after `ThankYou` render; mask phone in admin list (`06••••••12`, full on click + audit log); sanitize `tel:` (`phone.replace(/[^0-9+]/g,'')`); `rel="noreferrer noopener"`; stop short-UUID display (use row number).
- [ ] `importers.js:170 og:description` stored raw — safe as text today; add test asserting no `dangerouslySetInnerHTML` on book fields (allow only QR after 14 fix).

## Touches

- `src/pages/Checkout.jsx`, `ThankYou.jsx`, `src/pages/admin/BookForm.jsx`, `OrdersAdmin.jsx`, `src/lib/admin.js`, `src/lib/importers.js`, `netlify/functions/*.mjs` error mapping.

## Risks / notes

- Breaking: stricter phone/address rejects some legacy rows — provide admin override + migration to clean.
