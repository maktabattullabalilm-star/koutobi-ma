# 25. Lint / format / types + dead-code + error-style cleanup

- **Status:** **done**
- **Done 2026-09-22:** `eslint.config.js` (react+hooks, `react/no-danger`, no-console) + `.prettierrc.json` + `.editorconfig` + scripts `lint/format/format:check/typecheck/verify`; `tsconfig.json` completed for real `tsc --noEmit` (clean, incl. `@types/react`); `vite` test include covers `ts/tsx`; deleted dead `src/lib/utils.ts` (`cn` package is the canonical merger — ui imports it directly); removed dead `query()` + identical ternary in `api.js`; `BookDetail` uses `isSoldOut()` only; `Toast.show(message, tone)` honors `'error'` (5s) + `useRef` timer; removed all dead `eslint-disable`s and fixed the two real `exhaustive-deps` issues properly (deps added / `useCallback`); removed dead imports (Dashboard Select, BookForm unused); fixed hanging `AdminSmoke` mocks (stable `useNavigate`/`show` via `vi.hoisted`).
- **Error policy (adopted):** admin writes `throw` mapped Arabic errors at the UI boundary (never raw `err.message` for 500s — detail goes to `console.error`/server logs); public reads fail open (`[]/null`) only with a code comment saying why; bare `catch {}` forbidden (at minimum log + fallback).
- **Deferred:** `knip`/`jscpd` CI gates (nice-to-have; unused-vars + review cover it today); full `strict:true` + `checkJs` (needs JSDoc pass — candidate follow-up).
- **Size:** M
- **Depends on:** nothing (enables 21, 22, 26)
- **Severity:** quality high

## Goal

Style drift impossible; dead code gone; errors handled one way and documented.

## Findings

- No eslint/prettier/editorconfig/biome; no `lint/format/typecheck` scripts; no `typescript` dep (`tsconfig.json:1-9` minimal, no `strict`). Drift: quotes/semicolons (`api.js:1` vs `button.tsx:1-4`), Tailwind `mb-1!`/`aspect-680/960`/`outline-hidden` unlinted, dead `eslint-disable` ×5 (`CatalogData.jsx:280`, `Dashboard.jsx:49`, `BookForm.jsx:185`, `Settings.jsx:54`).
- JS vs TS: 10×`.js` + lone `utils.ts:1` (`export {cn} from "cn"` obscure dep `package.json:19`); app `.jsx` vs `ui/*.tsx` (`components.json:tsx:true` lie); `vite.config.js:22` excludes `.ts/.tsx` tests.
- Dead/smell: `api.js:7-12 query()` never called; `getRelatedBooks:94-99` identical branches; `Toast.jsx:show(message)` drops `'error'` (30+ callers); `timer` in `useState` not `useRef`; `BookDetail.jsx:98 inStock` dupes `isSoldOut()`; `ThankYou.jsx:19 scrollTo` dupes `ScrollToTop.jsx`.
- Error mix undocumented: `throw new Error` (22 sites `admin.js`) vs fail-open `return []/null` (`api.js:19,26,33,39,81,90`) vs swallowed `catch{}` (`BookDetail.jsx:37,53`, `Dashboard.jsx:48`, `Settings.jsx:52`, ...); `loadProfile:11-14` no try.

## Spec / acceptance criteria

- [ ] Add `eslint (flat) + prettier + editorconfig`, scripts `lint/format/format:check/typecheck`; CI gates them. Decide TS: either full-`checkJs` strict on `.js` or migrate `lib/` to `.ts` — and fix `utils.ts` (replace `cn` dep with `clsx+tailwind-merge` or delete wrapper).
- [ ] Fix `vite.config.js` include to `src/**/*.{test}.{js,jsx,ts,tsx}`; remove dead `eslint-disable`s or honor with real eslint.
- [ ] Fix `Toast` to `show(message, tone)` + `useRef` timer + `role=status` (with 28); remove dead `query()`, collapse identical ternary, use `isSoldOut()` everywhere, drop duplicate `scrollTo`.
- [ ] Document error policy in `docs/`: `throw` for admin writes, fail-open only for public reads with comment, never bare `catch{}` (log + fallback); add `try` to `loadProfile`.
- [ ] `knip` for unused exports + `jscpd` threshold.

## Touches

- Root configs, `package.json`, `src/lib/*`, `src/components/Toast.jsx`, `src/pages/*`, `vite.config.js`.

## Risks / notes

- Breaking: `cn` dep swap + TS strict surface many errors — fix in one pass with codemod.
