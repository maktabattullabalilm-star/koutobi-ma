import { describe, expect, it } from 'vitest';
import { LOCALE, t } from './i18n';
import { slugifyAr } from './slug';

describe('i18n infra (docs/backlog/27)', () => {
  it('resolves dictionary paths with key fallback', () => {
    expect(t('order.errors.phone')).toContain('0612345678');
    expect(t('announcement.close')).toBe('إغلاق الإعلان');
    expect(t('nope.missing')).toBe('nope.missing');
  });

  it('pins the active locale', () => {
    expect(LOCALE).toBe('ar-MA');
  });
});

describe('slugifyAr', () => {
  it('transliterates Arabic names to ASCII slugs', () => {
    expect(slugifyAr('العقيدة والتوحيد')).toBe('alaqyda-waltwhyd');
    expect(slugifyAr('التفسير وعلوم القرآن')).toBe('altfsyr-walwm-alqraan');
  });

  it('keeps latin/digits, drops punctuation, caps length', () => {
    expect(slugifyAr('Fiqh 101!')).toBe('fiqh-101');
    expect(slugifyAr('  ')).toBe('');
    expect(slugifyAr('أ'.repeat(200)).length).toBeLessThanOrEqual(80);
  });
});
