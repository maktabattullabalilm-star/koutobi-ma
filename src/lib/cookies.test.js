import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CONSENT_KEY,
  CONSENT_VERSION,
  acceptAllCookies,
  getConsent,
  isConsented,
  rejectOptionalCookies,
  saveCustomCookies,
  whenConsented,
} from './cookies';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('cookie consent storage', () => {
  it('returns null when nothing was ever chosen', () => {
    expect(getConsent()).toBeNull();
    expect(isConsented('statistics')).toBe(false);
    expect(isConsented('marketing')).toBe(false);
    expect(isConsented('necessary')).toBe(true);
  });

  it('accept-all enables optional categories with a 12-month expiry', () => {
    acceptAllCookies();
    const stored = getConsent();
    expect(stored.statistics).toBe(true);
    expect(stored.marketing).toBe(true);
    const monthsLeft =
      (new Date(stored.expiresAt) - new Date()) / (30 * 24 * 3600 * 1000);
    expect(monthsLeft).toBeGreaterThan(11);
    expect(isConsented('statistics')).toBe(true);
  });

  it('reject-optional keeps everything off but records the choice', () => {
    rejectOptionalCookies();
    const stored = getConsent();
    expect(stored).not.toBeNull();
    expect(stored.statistics).toBe(false);
    expect(isConsented('marketing')).toBe(false);
  });

  it('saves granular custom choices', () => {
    saveCustomCookies({ statistics: true, marketing: false });
    expect(isConsented('statistics')).toBe(true);
    expect(isConsented('marketing')).toBe(false);
  });

  it('ignores records from older versions and expired choices', () => {
    localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({ version: 0, statistics: true, marketing: true, expiresAt: '2999-01-01' })
    );
    expect(getConsent()).toBeNull();
    localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({
        version: CONSENT_VERSION,
        statistics: true,
        marketing: true,
        expiresAt: '2000-01-01',
      })
    );
    expect(getConsent()).toBeNull();
  });

  it('gates future vendors on consent and fires on later opt-in', () => {
    const loader = vi.fn();
    const off = whenConsented('statistics', loader);
    expect(loader).not.toHaveBeenCalled();
    saveCustomCookies({ statistics: true, marketing: false });
    expect(loader).toHaveBeenCalledTimes(1);
    off();
  });
});
