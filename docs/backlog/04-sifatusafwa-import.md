# 4. Import book from sifatusafwa URL

- **Status:** planned
- **Size:** M
- **Depends on:** image system v2 (imported covers flow through it)

## Goal

Paste a sifatusafwa product link into the dashboard → book fields
(title, author, publisher, specs, description, cover) come prefilled →
admin reviews/edits → creates the book. Cover is **downloaded to our R2**,
never hotlinked.

## Spec / acceptance criteria

- [ ] "استيراد من رابط" entry point in BookForm (and/or BooksAdmin):
  URL input + fetch button.
- [ ] New endpoint `POST /api/import-sifatusafwa` `{ url }` (admin JWT +
  RLS check, same as upload): validates the URL host is sifatusafwa.com,
  fetches the page server-side, parses the spec table
  (Title/Author/Edition/Pages/Format/Cover) + `og:image` cover.
- [ ] Response returns structured fields; the form prefills, admin edits
  freely; cover downloads to R2 under `covers/imported-*` on save
  (reuses the upload pipeline).
- [ ] Review screen is mandatory — nothing is created without admin
  confirmation (prices especially: sifatusafwa sells in EUR, we sell in MAD).
- [ ] Graceful degradation: fetch/parse failures show which fields failed
  and fall back to manual entry with the URL kept as reference.

## Touches

- `netlify/functions/import-sifatusafwa.mjs` (fetch + HTML parse, no new deps
  if possible — regex/DOM-lite parsing).
- `BookForm.jsx` (import panel + prefill mapping).
- Tests: parser unit tests against saved HTML fixtures.

## ⚠️ Known risk (stated upfront)

sifatusafwa sits behind Cloudflare bot challenge — our headless browser
already got challenged. Netlify function egress IPs will **likely** get
challenged too. Mitigations, in order:
1. Try direct server fetch with browser-like headers.
2. If challenged: "paste page HTML" mode — admin opens the page in their
   own browser, copies HTML, parser runs on that.
3. Manual entry remains fully available; the review screen exists regardless.

If (1) never works in practice, the feature ships as (2)+(3) and this file
is updated to say so.
