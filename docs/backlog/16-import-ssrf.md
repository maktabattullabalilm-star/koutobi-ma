# 16. Import SSRF + payload hardening (ISBN / sifatusafwa)

- **Status:** **done**
- **Done 2026-09-22:** new `netlify/functions/_lib/fetch-safe.mjs` (https-only, host allowlist, DNS private-IP rejection, 3-redirect cap, timeouts) + `_lib/covers.mjs` (shared SSRF-guarded cover download with magic-byte validation, random keys, `ContentDisposition: inline`); both importers use them; HTML paste capped at 500KB (URL + paste paths); cover hosts allowlisted (openlibrary/google/sifatusafwa).
- **Accepted residual:** `lookupIsbn` metadata fetch uses fixed hosts + normalized ISBN (no attacker URL) — guarded cover/page fetch was the real SSRF surface.
- **Size:** M
- **Depends on:** 10 (shared magic-byte/fetch helper)
- **Severity:** medium (M5)

## Goal

Import endpoints can never be used as SSRF proxy or ReDoS/DoS sink.

## Findings

- `import-sifatusafwa.mjs:121` allowlists `hostname==sifatusafwa.com` + `20s AbortController:125-127` (good), but `html` paste mode unbounded → regex `parseSifatusafwa()` ReDoS / large-payload DoS (no `html.length` cap).
- `import-isbn.mjs:74-95 downloadCoverToR2(coverUrl)` fetches OpenLibrary/GoogleBooks URL with no timeout, follows redirects, `extFromContentType:67-71` trusts header only, no magic bytes, no private-IP block → redirect to `169.254.169.254` if upstream compromised.

## Spec / acceptance criteria

- [ ] Shared `netlify/functions/_lib/fetch-safe.js`: `fetchWithTimeout(15s)`, max 3 redirects, deny private/loopback/link-local DNS, max body 5MB (covers) / 500KB (html), verify magic bytes PNG/JPEG/WEBP/GIF/AVIF.
- [ ] Both importers + `upload-image` use it; `html` paste capped + rejected with Arabic 413 message.
- [ ] `sifatusafwa` URL mode keeps hostname allowlist; `isbn` cover URL restricted to `covers.openlibrary.org` + `books.google.com` (+ redirect chain must stay public IP).
- [ ] Fallback `{url:original, r2_key:null}` (`import-isbn.mjs:126`) documented + CSP-limited (13); prefer fail-closed to R2 or reject.

## Touches

- `netlify/functions/import-*.mjs`, `upload-image.mjs`, new `_lib/` (see 24).

## Risks / notes

- Over-strict IP blocking can break in VPC/DNS-split environments — log + allowlist override env.
