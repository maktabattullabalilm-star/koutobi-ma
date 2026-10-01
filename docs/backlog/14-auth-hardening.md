# 14. Auth hardening (signup, passwords, MFA enforce, tokens)

- **Status:** **done**
- **Done 2026-09-22:** invite-only (signup UI removed from `AdminLogin`), `PASSWORD_MIN=12` in `src/lib/constants.js` enforced in Setup/Reset/Settings, generic login errors (no enumeration), MFA challenge fail-closed once a factor is known, `loadProfile` try/catch + `select(id,role)`, QR via `<img>` (no `innerHTML`), enumeration-neutral setup message.
- **Still manual (owner, Supabase Dashboard):** Auth → Password protection → enable leaked-password check (advisor `auth_leaked_password_protection` still WARN until then); consider disabling public signups at provider level as belt-and-braces.
- **Deferred to 21/30:** RLS `aal2` enforcement for admin writes (needs careful rollout + tests, not a blind policy change).
- **Size:** M
- **Depends on:** 11 (RLS `aal` check), 12 (secret scopes)
- **Severity:** medium (M1) + low (L1-L3)

## Goal

Public cannot spam users; admins have strong passwords + enforced MFA; tokens/QR never leak.

## Findings

- `AuthContext.jsx:38-42` open `signUp()` from `/admin`; spam + email enumeration (`already registered` branch `AdminSetup.jsx:93`); no captcha/confirm visible.
- Password min 6 (`AdminLogin.jsx:55`) vs min 8 (`AdminSetup.jsx:73`, `ResetPassword.jsx:35`, `Settings.jsx:60`) — inconsistent, no `zxcvbn`/breach check.
- `AdminLayout.jsx:42-44` client-only gate (RLS is real enforcement — ok) but `loadProfile:11-14` (`select('*')`, no try) races `getSession()` → flicker/redirect.
- MFA fails open (`AdminLogin.jsx:45-53 try{listFactors/challenge}catch{continue}`); `supabase-js` token in `localStorage` (default); invite `?t=` in URL (`AdminSetup.jsx:19,60-67`, `claim_first_admin` unverifiable); QR via `dangerouslySetInnerHTML` (`Settings.jsx:213`, trusted SVG from `mfa.js:20-24` but XSS sink).

## Spec / acceptance criteria

- [ ] Invite-only signup: disable public signup (Supabase Auth → disable signups or remove UI path); admin creation via invite RPC only; generic "if registered, check email" (no enumeration).
- [ ] Unified password: min 12 + `zxcvbn` score ≥3 client + Supabase pwned-password check on; single constant `PASSWORD_MIN=12`.
- [ ] Enforce MFA for `role=admin`: RLS helper `is_admin_mfa()` checks `auth.jwt()->>'aal'='aal2'`; admin writes require MFA; dashboard nudge becomes block.
- [ ] Fix `loadProfile` (try/catch, `select(id,role)` only, skeleton not redirect-flash) + reusable `<ProtectedRoute>` (see 21).
- [ ] Invite token via `POST` body, one-time, hashed, 24h expiry, audit log (part of 11).
- [ ] QR rendered via `<img src={data:image/svg+xml;utf8,...}>` or `DOMPurify`, never raw `innerHTML`.
- [ ] Document token storage (`localStorage` + XSS implication → motivates 10/13) + short session + sign-out everywhere.

## Touches

- `src/context/AuthContext.jsx:11-52`, `src/pages/admin/AdminLogin.jsx`, `AdminSetup.jsx`, `Settings.jsx:186-244`, `AdminLayout.jsx`, `src/lib/mfa.js`, Supabase Auth settings + RLS.

## Risks / notes

- Breaking: public signup removed; existing weak passwords forced to rotate; admins without MFA locked until enroll (provide recovery via dashboard, cf. 07).
