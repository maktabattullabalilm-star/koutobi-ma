/**
 * Contact e-mail for the storefront footer, editable from
 * Admin → محتوى المتجر → هوية المتجر → روابط مواقع التواصل.
 * Kept in its own module so the admin editor and the footer share one rule.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

export function verifyEmail(value) {
  const email = String(value || '').trim();
  if (!email) return { valid: true, empty: true, email: '' };
  if (email.length > 254 || !EMAIL_RE.test(email)) {
    return {
      valid: false,
      empty: false,
      email,
      message: 'أدخل بريداً إلكترونياً صالحاً مثل name@example.com',
    };
  }
  return { valid: true, empty: false, email };
}

/** `mailto:` link for a valid address, or '' so callers can hide the row. */
export function mailtoHref(value) {
  const { valid, empty, email } = verifyEmail(value);
  return valid && !empty ? `mailto:${email}` : '';
}
