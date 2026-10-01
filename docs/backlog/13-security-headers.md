# 13. Security headers + CSP + caching (Netlify)

- **Status:** **done**
- **Size:** S
- **Depends on:** 10 (img-src allowlist must match R2 decision)
- **Severity:** medium (M2)

## Goal

Admin not clickjackable, R2 hotlink contained, deploys never serve stale SPA.

## Findings

- `netlify.toml:1-15` has only `[build]+[functions]+[[redirects] /*→/index.html 200]`. Zero `[[headers]]`.
- No CSP/HSTS/`X-Frame`/`nosniff`/`Referrer-Policy`/`Permissions-Policy`. Functions use `Response.json` with no CORS headers (same-origin via `config.js:2-4 /api/*`, fail-closed but undocumented). No explicit `/api/*` passthrough — fragile ordering.

## Spec / acceptance criteria

- [ ] Add `[[headers]]`:
  - `/assets/*`: `Cache-Control: public, max-age=31536000, immutable`.
  - `/index.html` + `/`: `Cache-Control: no-cache`.
  - `/*`: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` (or `frame-ancestors 'none'`), `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), mic=(), geolocation=()`, `Strict-Transport-Security: max-age=31536000; includeSubDomains`.
  - CSP: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src fonts.gstatic.com; img-src 'self' https://pub-*.r2.dev https: data:; connect-src 'self' https://*.supabase.co; frame-ancestors 'none'`.
- [ ] `/api/*`: `Cache-Control: no-store` + document same-origin (no `Access-Control-Allow-Origin`), explicit `[[redirects]] /api/* → functions 200` before SPA fallback + `OPTIONS → 204`.
- [ ] `index.html`: add `<meta name="referrer" content="strict-origin-when-cross-origin">`.
- [ ] Verify with `curl -I` + Mozilla Observatory / securityheaders.com.

## Touches

- `netlify.toml`, `index.html`, R2 bucket CORS/readme.

## Risks / notes

- CSP `img-src https:` needed temporarily for `import-isbn` fallback hotlinks (`import-isbn.mjs:126`); tighten after 16 migrates all to R2.
