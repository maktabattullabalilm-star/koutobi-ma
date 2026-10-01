import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import CookieConsent from './CookieConsent';
import { getConsent, openCookiePreferences } from '../lib/cookies';

afterEach(cleanup);

function setup() {
  localStorage.clear();
  render(<CookieConsent />);
}

describe('CookieConsent banner', () => {
  it('shows on first visit and hides after accepting all', () => {
    setup();
    expect(screen.getByRole('dialog', { name: 'موافقة ملفات الارتباط' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'قبول الكل' }));
    expect(screen.queryByRole('dialog', { name: 'موافقة ملفات الارتباط' })).toBeNull();
    expect(getConsent().marketing).toBe(true);
  });

  it('stays hidden when a valid choice already exists', () => {
    localStorage.setItem(
      'koutobi_cookie_consent_v1',
      JSON.stringify({ version: 1, statistics: false, marketing: false, expiresAt: '2999-01-01' })
    );
    render(<CookieConsent />);
    expect(screen.queryByRole('dialog', { name: 'موافقة ملفات الارتباط' })).toBeNull();
  });

  it('customizes per category with a visible cookie list', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'تخصيص' }));
    // necessary toggle is locked on
    expect(screen.getByRole('switch', { name: 'ملفات الارتباط ضرورية' }).disabled).toBe(true);
    fireEvent.click(screen.getByRole('switch', { name: 'ملفات الارتباط إحصائية' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'عرض قائمة ملفات الارتباط' })[1]);
    expect(screen.getByRole('table')).toBeTruthy();
    expect(screen.getByText('لا يوجد مورّد نشط')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'حفظ اختياري' }));
    const stored = getConsent();
    expect(stored.statistics).toBe(true);
    expect(stored.marketing).toBe(false);
  });

  it('reopens preferences from the footer event', () => {
    localStorage.setItem(
      'koutobi_cookie_consent_v1',
      JSON.stringify({ version: 1, statistics: false, marketing: false, expiresAt: '2999-01-01' })
    );
    render(<CookieConsent />);
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => openCookiePreferences());
    expect(screen.getByRole('dialog', { name: 'موافقة ملفات الارتباط' })).toBeTruthy();
  });
});
