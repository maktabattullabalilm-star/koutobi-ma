# 12. Secrets hygiene + leak prevention

- **Status:** **done**
- **Size:** S
- **Depends on:** nothing
- **Severity:** high (H5)

## Goal

No service-role key on dev machines, in git, in build logs, or in Netlify frontend env. Any past exposure rotated.

## Findings

- `.env` / `.env.production` contain `SUPABASE_SERVICE_ROLE_KEY` key locally, while `.env.example:19-25` + `docs/backlog/README.md:27` correctly say anon+RLS only.
- Currently untracked (`git ls-files` only `.env.example`) — good — but `VITE_` typo, `npm run build` log, or Netlify copy-paste exfiltrates full bypass.
- `.env.production` is Vite build input (anything `VITE_` leaks to `dist/`).

## Spec / acceptance criteria

- [ ] Delete `SUPABASE_SERVICE_ROLE_KEY` from `.env`, `.env.production`, Netlify dashboard (frontend + functions env) unless proven needed; if ever populated, rotate in Supabase Dashboard → API.
- [ ] Add `gitleaks` pre-commit + CI check; add `.env*.local` to `.gitignore`; add `scripts/check-no-secrets.sh` (grep `eyJ|SERVICE_ROLE|R2_SECRET` in tracked files + `dist/`).
- [ ] Netlify: split env scopes — `VITE_*` (frontend) vs `R2_*/SUPABASE_*` (functions-only); document in `.env.example`.
- [ ] Verify: `git grep -i service_role`, `grep -r VITE_ netlify/functions`, `dist/` bundle contains no `SERVICE_ROLE` / `R2_SECRET`.

## Touches

- `.env.example`, `.gitignore`, `.husky/` or `lefthook`, `netlify.toml` docs, this file.

## Risks / notes

- Rotating service-role invalidates any scripts using it — audit CI/scripts first.
