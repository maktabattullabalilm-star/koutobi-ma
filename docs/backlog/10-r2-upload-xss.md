# 10. R2 upload XSS hardening (remove SVG + magic bytes)

- **Status:** **done**
- **Size:** M
- **Depends on:** nothing (ship ASAP)
- **Severity:** high (H3)

## Goal

Public R2 covers can never execute JS. Direct `POST /api/upload-image` bypassing client resize must be safe.

## Findings

- `netlify/functions/upload-image.mjs:87-92` allows `svg`, trusts client `file.type` (`ext=file.type.match(...)`), sets `ContentType: file.type :115`, `CacheControl: public,immutable :116`.
- Client `src/lib/images.js:85-91` rasterizes to jpeg/webp, but attacker skips it: `{type:'image/svg+xml', base64:'<svg onload=...>'}` → stored XSS on `r2.dev` origin when opened directly / via `<object>` / hotlink. URL mirrored to `books.cover_image` / `book_images.url`.
- No magic-byte check, no `Content-Disposition`, no CSP containment.

## Spec / acceptance criteria

- [ ] Remove `svg` from allowlist (client already rasterizes; SVG covers not needed). Allowed: `png, jpeg, jpg, webp, gif, avif`.
- [ ] Server validates magic bytes (`file-type` or manual header sniff) + `file.type` must match sniffed MIME; mismatch → 400.
- [ ] Enforce `MAX_BYTES=6MB` already there, align client `IMAGE_MAX_KB=180:images.js:7` contract documented in function comment (client compresses, server caps).
- [ ] Serve with `ContentType` from sniffed type only, plus `ContentDisposition: inline`, bucket `X-Content-Type-Options: nosniff`; CSP `img-src` allowlist (see 13) so hotlink execution contained.
- [ ] Randomize keys beyond `Date.now()`: `covers/${Date.now()}-${crypto.randomUUID().slice(0,8)}.${ext}` (also fixes guessable keys L4).
- [ ] Tests: svg upload rejected, mismatched mime rejected, polyglot rejected, valid webp/jpeg pass.

## Touches

- `netlify/functions/upload-image.mjs:17,87-116`, `src/lib/images.js:7-9,85-127`.
- Bucket config doc (public-read, list-denied, write-deny anon).

## Risks / notes

- Breaking: existing SVG covers (if any) should be re-encoded to webp; list + migrate.
