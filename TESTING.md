# TESTING — hand-testing guide (for you, in your browser)

> **Rule: nothing gets pushed to Netlify until you explicitly approve it.**
> You test everything yourself locally first, using the steps below.

## Start the site locally

```bash
cd /home/ia/Projects/websites/koutobi-ma
npm run dev
```

Open in your browser: **http://localhost:5173**

(The local site talks to the live Supabase project, so what you see
and click is real data — no deploy needed.)

To test cover uploads locally (the Netlify function), run instead:

```bash
netlify dev
```

then open **http://localhost:8888** — same site, plus the
`/api/upload-image` function works.

## Storefront checklist (shop like a customer)

- [ ] Homepage loads: hero, categories, new releases, bestsellers, how-it-works
- [ ] Catalog (`/catalog`): all 5 books show with real covers and prices
- [ ] Search: type part of a title, results filter
- [ ] Category chips filter the grid; sorting changes the order
- [ ] Book page: open a book — cover, price, discount, description, specs table, related books
- [ ] Add to cart → cart badge count goes up → `/cart` shows the item
- [ ] Change quantity, remove item — totals update
- [ ] Checkout: fill **TEST-DATA ONLY** (see below) → confirm → thank-you page shows order number
- [ ] WhatsApp buttons point to **+212 624-182004**

## Verify the order actually saved

Supabase Dashboard → your project → **Table Editor** → `orders`:
your TEST order row must be there, with its items in `order_items`.

## Admin checklist (`/admin`)

- [ ] Login with your admin account lands in the dashboard (stats visible)
- [ ] Orders board shows the TEST order → change its status → confirm it sticks after reload
- [ ] Books table lists the 5 books → edit one (change something small) → check it on the storefront
- [ ] Upload a cover image on a book → save → check the new image on the storefront
      (uploads go to your R2 bucket — verify in Cloudflare Dashboard → R2 → `koutobi-ma`)
- [ ] Change-password field in the dashboard works (log out, log back in with the new password)

## Import panel (`/admin/books/new` → استيراد 📥)

- [ ] ISBN tab: enter `9780131103627` → بحث → fields prefill from Open Library,
      cover attached as primary → **delete the test book afterwards** (and its
      `covers/imported-*` object from R2)
- [ ] ISBN tab: enter `123` → clear client-side error "رقم ISBN غير صالح"
- [ ] ISBN tab: enter a valid-but-unknown ISBN (e.g. `9786038245999`) →
      friendly "لم يتم العثور" message, form stays manual
- [ ] sifatusafwa tab: paste a product URL → جلب → fields prefill
      (if the server is blocked: paste-HTML box appears → open the page in your
      browser, Ctrl+U, copy all, paste, تحليل → same prefill)
- [ ] Imported cover lands in R2 under `covers/imported-*` (check R2 dashboard)
- [ ] Nothing is created until you press نشر/حفظ — review screen IS the form

## Two-factor login (dashboard → التحقق بخطوتين)

- [ ] Dashboard shows the amber "فعّل التحقق بخطوتين" nudge
- [ ] تفعيل → QR appears → scan with Google Authenticator → enter code → success
- [ ] Log out → log in with password → code screen appears → correct code enters,
      wrong code shows an error
- [ ] Dashboard → إلغاء التفعيل → next login is password-only again
- [ ] Recovery (if you lose your phone): Supabase Dashboard → Authentication →
      Users → your user → delete the MFA factor, then log in password-only

## Netlify functions locally (for me / advanced)

```bash
netlify dev --port 8888   # serves site + functions at :8888
curl -X POST localhost:8888/api/import-isbn \
  -H 'Content-Type: application/json' -d '{"isbn":"x"}'   # → 401 without admin JWT
```
Happy-path function tests need a real admin session — use the browser flow above.

## Test-data rules (keep the store clean)

- Always use obvious fake data: name `TEST-…`, phone `0600000000`,
  address `TEST address …`.
- After each session, delete test orders: paste
  `scripts/cleanup-test-data.sql` into Supabase → SQL Editor → Run.
  (`order_items` disappear automatically.)
- Test covers: upload with filenames starting `test-`, then delete them
  from the R2 dashboard (or ask me and I'll remove them).
- Test auth accounts: delete in Supabase Dashboard → Authentication → Users.
  (SQL cannot delete auth users.)
- Never test with the real admin account's password anywhere except login,
  and never re-use the burned one-time setup link.

## After everything passes

Tell me it's good — only then do I run `npm run build` and deploy
to Netlify on your explicit approval.

---
*Note for developers: an automated vitest suite also exists
(`npm test`, 83 tests, mocked Supabase). It guards the code but never
replaces the hand-testing above.*
