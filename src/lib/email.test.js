import { describe, expect, it } from 'vitest';
import { mailtoHref, verifyEmail } from './email';

describe('contact e-mail', () => {
  it('accepts the store address and normal ones', () => {
    expect(verifyEmail('salam@koutobi.ma')).toMatchObject({
      valid: true,
      empty: false,
      email: 'salam@koutobi.ma',
    });
    expect(verifyEmail('  contact@example.co.uk  ').email).toBe('contact@example.co.uk');
  });

  it('treats blank as "hide the row", not an error', () => {
    expect(verifyEmail('')).toMatchObject({ valid: true, empty: true });
    expect(verifyEmail(null)).toMatchObject({ valid: true, empty: true });
    expect(mailtoHref('')).toBe('');
  });

  it('rejects malformed addresses', () => {
    for (const bad of ['salam', 'salam@', '@koutobi.ma', 'salam@koutobi', 'sa lam@koutobi.ma', 'a@b.c']) {
      expect(verifyEmail(bad).valid, bad).toBe(false);
    }
  });

  it('builds a mailto link only for a valid address', () => {
    expect(mailtoHref('salam@koutobi.ma')).toBe('mailto:salam@koutobi.ma');
    expect(mailtoHref('not-an-email')).toBe('');
  });
});
