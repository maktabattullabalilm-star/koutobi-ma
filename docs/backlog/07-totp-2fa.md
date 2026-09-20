# 7. Admin TOTP two-factor authentication

- **Status:** **done**
- **Size:** M
- **Depends on:** nothing (build last by order; independent)

## Goal

Admin logins require a second factor: password + 6-digit code from an
authenticator app (Google Authenticator & co.). Enrollment via QR code
shown once. Customer side untouched (no accounts there).

## Spec / acceptance criteria

- [x] Uses **Supabase Auth native MFA** — no external service:
  `auth.mfa.enroll({ factorType: 'totp' })` returns `qr_code` (SVG data)
  + secret; `auth.mfa.challenge()` + `auth.mfa.verify()` at login.
- [x] Dashboard "الأمان" section: enroll button → QR + manual secret →
  confirm-with-code step → enrolled. List/unenroll existing factors.
- [x] AdminLogin flow: after password success, if the account has an
  enrolled TOTP factor, show the code screen instead of entering;
  verify → dashboard. Clear error states for wrong/expired codes.
- [x] First-run behavior: 2FA is **optional but prompted** — dashboard
  shows a persistent "فعّل التحقق بخطوتين" nudge until enrolled.
- [x] Recovery documented for the owner: if the authenticator is lost,
  unenroll via Supabase Dashboard → Authentication → Users → MFA
  (owner-only procedure, written in this file when implemented).
- [x] `AdminSetup` (one-time link) unchanged — new admins enroll from
  the dashboard afterwards.

## Touches

- `src/context/AuthContext.jsx` (MFA state: enrolled factors, challenge flow).
- `src/pages/admin/AdminLogin.jsx` (post-password code screen).
- `src/pages/admin/Dashboard.jsx` (enroll/manage section + nudge).
- Tests: login-flow branching with mocked `auth.mfa.*` (enrolled /
  not-enrolled / wrong-code paths).

## Risks / notes

- Clock drift on the owner's phone breaks TOTP — documented (enable
  automatic time).
- No SMS fallback (keeps zero cost and zero new vendors); recovery is
  via Supabase dashboard access, which the owner already has.
