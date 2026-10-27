# 31. Store identity, SEO and no-fallback storefront

- **Status:** in_progress (partial `1.1.9` patch already in the working tree)
- **Size:** L
- **Severity:** multi-client blocker — every new library currently inherits
  koutobi’s (or a generic placeholder’s) name, favicon, SEO and legal copy.
- **Depends on:** — (builds on the done work from historical backlog 19/29)

## Goal

Every library must be able to publish its own brand and business information
from the admin panel, without a code change or deploy:

- name, logo, favicon, PWA icons, colours, social links, contact e-mail;
- browser title, meta description, Open Graph / Twitter preview, JSON-LD;
- phone / WhatsApp numbers (already in `app_settings`);
- legal / business identity (legal name, ICE, tax ID, address, city, hours, map);
- previously hardcoded copy (footer note, checkout COD note, catalog/cart
  taglines, WhatsApp messages).

There must be **no silent fallback**. If store information cannot be fetched,
the storefront shows a clear internet/reload error instead of another store’s
data, stale data or invented defaults.

## Locked decisions (owner, 2026-10-26)

- **Admin-owned.** Values live in the DB and are edited in Admin → Settings.
  No build-time branding from `clients/<slug>/meta.json`.
- **Minerva credit stays hardcoded** in the footer (`© Minerva | DIGITAL Agency`).
- **All P0 audit findings are in scope.**
- **P1 scope:** copywriting, deploy defaults and SEO. Skip font/radius/theme
  presets — keep the five existing colour fields; colours are a design token,
  not the priority.
- **Morocco only:** MAD, `+212`, Arabic/RTL, cash on delivery. No
  multi-country/multi-currency work.
- **Business/legal fields are in scope.**
- **No fallback:** fetch failure → error + “أعد تحميل الصفحة”. Not-configured
  optional content is hidden; missing required identity blocks the storefront.
- **Online-only:** the partial patch removed the PWA service worker; the
  manifest remains for name/icons/theme only. Keep it that way (no offline
  shell, no cached brand).

## Current state (partial `1.1.9` in the working tree)

Already done by the in-progress patch — build on it, do not revert:

- Removed bundled koutobi name/phone/e-mail, `sampleData`, demo mode and
  `seed-parity` tests.
- Added `src/components/NetworkGuard.jsx` (offline-only message + reload).
- Footer/admin login/admin layout read brand from `storefront_content`.
- `CONTENT_DEFAULTS` replaced by empty `CONTENT_SHAPES`; missing rows are hidden.
- `useSiteContact` / `whatsappLink` no longer invent a phone number.
- PWA plugin/workbox removed; Minerva credit kept.

Remaining gaps:

- `index.html`, `public/manifest.webmanifest`, `public/favicon.svg` and
  `src/hooks/useHead.js` still contain a **hardcoded** name/description
  (“مكتبة الكتب الإسلامية”) — not editable.
- Failures are silently swallowed: `getStorefrontContent` returns hidden
  sections, `getCategories` returns `[]`, `getVisibleStorePages` returns `[]`.
  This contradicts the no-fallback rule.
- No identity/SEO/legal fields in Admin → Settings; no logo/favicon upload.
- No worker-side head injection, dynamic `manifest`/`robots`/`sitemap`.
- Deploy scripts still default the worker to `koutobi-ma`.

## 1. Data model

No schema migration is needed: `storefront_content.content` is JSONB with
public read + admin write RLS. Extend the `brand` object:

**Identity + SEO**

- `site_name` (explicit; do not derive from logo parts for `<title>`)
- `title_suffix`
- `meta_description`
- `logo_url`, `logo_mark`, `logo_name`, `logo_suffix`
- `favicon_url`, `apple_touch_icon_url`
- `icon_192_url`, `icon_512_url`, `maskable_512_url`
- `og_image_url`

**Business / legal**

- `contact_email`
- `address`, `city`
- `legal_name`, `ice`, `tax_id`
- `opening_hours`, `map_url`

Phone/WhatsApp stay in `app_settings` (`phone_number`, `whatsapp_number`).

**Copy sections** (extend the existing shapes; admin Content editor gains the
fields):

- `footer.shipping_note`, `footer.copyright` (default generated from site name)
- `checkout.cod_title`, `checkout.cod_note`, `checkout.delivery_note`
- `catalog.tagline`, `cart.tagline`
- `thankyou.*` support badges
- WhatsApp message strings interpolate the configured store name.

**Migration/rollout:** add a data migration that inserts/merges the current
koutobi brand row (`site_name`, title suffix, description, current favicon/
icons, socials, e-mail, legal placeholders) so the live site does not break
when required identity becomes mandatory. Use a JSONB merge (`||`) so existing
admin edits are preserved.

## 2. Admin UI — everything in Settings

Refactor `src/pages/admin/Settings.jsx` into tabs:

1. **الحساب والأمان** — existing password + TOTP.
2. **المتجر والهوية** — logo upload, mark/name/suffix, site name, title suffix,
   five colours, socials, contact e-mail, phone/WhatsApp.
3. **الظهور في البحث** — meta description, OG image upload.
4. **الأيقونات** — favicon, apple-touch, 192/512/maskable PWA icons.
5. **البيانات القانونية** — legal name, ICE, tax ID, address, city, hours, map.

- Move the existing `BrandEditor` out of `المحتوى`; leave a short “الهوية في
  الإعدادات” link on the content page. Content keeps sections/copy.
- Upload one square PNG → generate favicon/192/512/maskable derivatives in the
  browser and upload them to R2 (`covers/identity-…` keys). SVG uploads stay
  rejected (stored-XSS); an external HTTPS SVG URL may be accepted as a text
  field.
- Required before save: `site_name`, `meta_description`, at least one contact
  (phone, WhatsApp or e-mail). Storefront blocks with a “store not configured”
  screen if required identity is missing.
- Saving must merge into the existing JSON (never replace unknown keys), then
  refresh the shared identity context so the storefront updates immediately.
- Validate social URLs / e-mail with the existing helpers; validate hex colours.

## 3. Runtime identity + no-fallback behaviour

- Replace `useStorefrontContent` with a `StoreIdentityProvider` (or
  `StoreDataProvider`) that loads brand + app settings **once** and exposes
  `{ status: 'loading' | 'ready' | 'error', identity, reload }`.
- Gate `StoreLayout`, `AdminLayout`, `AdminLogin` and `AdminSetup` on `ready`.
- On fetch failure render a full-page `StoreDataError`:
  “تعذّر تحميل معلومات المتجر — تحقّق من الإنترنت ثم أعد تحميل الصفحة” + reload
  button. Keep `NetworkGuard` for `navigator.onLine === false`.
- Remove every swallow/fallback in storefront readers:
  - `getStorefrontContent` (currently returns `hiddenSections()` on error)
  - `getSiteContacts`, `getBooksPerRow`
  - `getCategories` (currently `[]`)
  - `getVisibleStorePages` / `getStorePage` (currently `[]` / `null`)
  - bundle/book reads and `useCatalog` error paths.
- Distinguish **not found** (404 page) from **fetch failed** (error + reload).
- Distinguish **not configured** (optional section → hide; required identity →
  setup/error screen) from **failed fetch** (always error).
- Remove DB-owned fallback lists: `FALLBACK_CATEGORIES`,
  `FALLBACK_PAPER/BINDING/SIZES`, StockAdmin fallback categories. They invent
  options that the DB does not contain.
- Keep layout constants (`books_per_row` default 4, neutral CSS palette, order
  status labels) — they are not store information.
- Remove the remaining generic brand hardcodes from `index.html`,
  `manifest.webmanifest`, `useHead.js`; the shell becomes a neutral bootstrap
  that runtime/edge replaces.
- Ship a one-release service-worker kill switch (`public/sw.js` unregister +
  clear caches) so clients that installed the old koutobi PWA do not keep the
  old shell.

## 4. Head / SEO delivery

Runtime alone cannot fix Google/WhatsApp/Facebook previews (they do not run
React). Implement two layers:

1. **Runtime (SPA):** `useHead` reads the identity context and applies title
   suffix, description, OG/Twitter, canonical, `theme-color`, favicon links and
   JSON-LD; per-route values for books/packs/pages.
2. **Cloudflare Worker (`HTMLRewriter`):** intercept document requests and
   write the same DB values into the initial HTML:
   - `/` + main routes → brand title/description/OG/JSON-LD/theme-color/icons;
   - `/book/:id`, `/pack/:id`, `/pages/:slug` → per-item title/description/OG
     (fixes the existing broken social previews; book pages currently always
     expose the static shell);
   - dynamic `/manifest.webmanifest`, `/robots.txt`, `/sitemap.xml` from DB
     (name, short name, icons, colours; visible pages/books with absolute URLs);
   - `SITE_URL` from `CLIENT_DOMAIN` at deploy (never trust the Host header);
   - cache successful reads briefly (~60 s); on DB failure return a **503**
     generic error page, never a wrong-brand page.
3. Store pages move to a canonical `/pages/:slug` so the Worker can intercept
   them without catching asset requests; keep `/:slug` as a client-side
   redirect for old links.

JSON-LD `BookStore` includes `name`, `description`, `url`, `image`,
`telephone`, `address`, `legalName`, `currenciesAccepted: MAD`,
`paymentAccepted: Cash on Delivery`, `inLanguage: ar`.

Netlify deploys remain runtime-only (degraded previews); Cloudflare is the
complete branding path. Document this in `docs/clients/README.md`.

## 5. Copy cleanup

- Footer: editable shipping note + copyright; Minerva credit fixed.
- Checkout: COD title/note and delivery note from content, not JSX.
- Catalog/Cart/ThankYou: remove hardcoded “الدفع عند الاستلام” / city claims
  into content sections.
- WhatsApp builders take the configured store name; no link when no number.
- Neutralise `KOUTOBI-…` coupon examples/prefix, `koutobi-stock.csv` export
  name, `[koutobi]` log prefixes.
- Fresh client DBs: neutral legal/info page seed (no koutobi name/domain);
  demo seed remains explicitly opt-in (`--with-seed`).
- Keep generic empty/error copy in `ar.json`; it is UI text, not store identity.

## 6. Deploy defaults & repository hygiene

- `scripts/new-client.sh` derives worker/bucket defaults from the slug.
- `scripts/deploy.sh` requires the worker name and R2 bucket; remove the
  `${WORKER_NAME:-koutobi-ma}` fallback. Pass `SITE_URL`, `SUPABASE_URL`,
  `SUPABASE_ANON_KEY` into the generated Wrangler config for the Worker.
- `templates/client.meta.json` uses the slug/placeholders, never `koutobi-ma`.
- Base `wrangler.jsonc` stays koutobi’s own config; generated
  `.wrangler.client.jsonc` always overrides name/bucket.
- Keep `public/covers/*` demo assets out of the client flow.

## 7. Security

- Uploads: admin-only, PNG/JPEG/WebP/GIF/AVIF magic-byte validation, no SVG.
- Store identity is public read (same as today); write stays admin/RLS.
- Worker uses the public anon key only, cache responses; no service-role key.
- External URLs (socials, map, logo) validated as `https://`; no `javascript:`.

## 8. Tests / acceptance criteria

- [ ] Admin can set site name, title suffix, description, logo, favicon, PWA
      icons, OG image, colours, socials, e-mail, phone/WhatsApp, address and
      legal identity; values render on the storefront.
- [ ] Title, OG, JSON-LD, `theme-color`, favicon and manifest reflect the DB
      without a deploy (runtime) and in the initial HTML (edge).
- [ ] No `koutobi` / `كُتُبِي` / old phone / old favicon in a build/render using
      another identity.
- [ ] Any failed fetch shows the error + reload screen; no stale, partial or
      invented content.
- [ ] Missing optional section is hidden; missing required identity shows the
      setup error and admin save validation prevents publishing it.
- [ ] 503 (not a branded page) when the edge cannot read identity.
- [ ] Dynamic sitemap includes visible pages + active books with absolute URLs;
      robots/maybe manifest correct per client.
- [ ] Minerva credit still hardcoded.
- [ ] Uploads validated; SVG rejected; replacing an icon produces a new URL.
- [ ] `npm run verify` green; new tests cover identity merge, head output,
      required fields, error states, WhatsApp interpolation.

## Touches

- `index.html`, `public/manifest.webmanifest`, `public/favicon.svg`,
  `public/icons/*`, `public/robots.txt`, `public/sitemap.xml`, `public/sw.js`
- `src/hooks/useHead.js`, `src/hooks/useStorefrontContent.js`,
  `src/hooks/useSiteContact.js`, `src/lib/storefrontContent.js`,
  `src/lib/siteSettings.js`, `src/lib/api.js`, `src/lib/config.js`,
  `src/lib/whatsapp.js`, `src/lib/i18n/ar.json`
- `src/components/{StoreLayout,Footer,Header,NetworkGuard}.jsx`
- `src/pages/admin/{Settings,StorefrontContent,AdminLogin,AdminSetup,AdminLayout}.jsx`
- `worker/index.js`, `worker/lib/*`, `wrangler.jsonc`, `netlify.toml`
- `supabase/schema.sql` + a data migration for the koutobi brand row
- `scripts/{deploy,new-client,setup-client-db}.sh`, `templates/client.meta.json`
- Tests listed above

## Risks / notes

- Edge injection adds Worker invocations and a DB dependency for HTML; cache
  identity briefly and return 503 (no brand) on failure.
- Admin edits reach crawlers after the cache TTL; humans see them immediately.
- R2-hosted icons are cross-origin; verify PWA install + maskable icons after
  switching to uploaded URLs.
- Two admin tabs saving the same JSON can drop fields; merge on save and/or
  re-read before write.
- Existing installed service workers must be killed explicitly.
- Legal copy is owner-supplied; the template is not legal advice.

## Open confirmations

1. Edge injection is assumed **yes** (required for correct social previews).
2. Copy fields stay in **المحتوى**; identity/SEO/legal live in **الإعدادات**.
3. Online-only (no service worker) is confirmed.
