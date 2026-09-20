import { describe, expect, it } from 'vitest';
import { formatDate, formatPrice, isImagePath, normalizeBook } from './format';

describe('formatPrice', () => {
  it('formats a number with the درهم suffix', () => {
    const out = formatPrice(70);
    expect(out).toContain('درهم');
    expect(out).toContain('70');
  });

  it('keeps up to two decimals', () => {
    expect(formatPrice(70.5)).toContain('درهم');
  });

  it('accepts numeric strings', () => {
    expect(formatPrice('120')).toContain('120');
  });

  it('returns an em dash for null, undefined and NaN', () => {
    expect(formatPrice(null)).toBe('—');
    expect(formatPrice(undefined)).toBe('—');
    expect(formatPrice(NaN)).toBe('—');
    expect(formatPrice('abc')).toBe('—');
  });

  it('formats zero without crashing', () => {
    expect(formatPrice(0)).toContain('درهم');
  });
});

describe('formatDate', () => {
  it('formats a valid ISO date', () => {
    const out = formatDate('2026-09-20T14:00:00.000Z');
    expect(out).not.toBe('—');
    expect(typeof out).toBe('string');
  });

  it('returns an em dash for falsy input', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate('')).toBe('—');
    expect(formatDate(undefined)).toBe('—');
  });
});

describe('isImagePath', () => {
  it('accepts http(s) and root-relative paths', () => {
    expect(isImagePath('https://pub-xxx.r2.dev/covers/a.jpg')).toBe(true);
    expect(isImagePath('http://localhost:5173/covers/a.svg')).toBe(true);
    expect(isImagePath('/covers/daa-wa-dawaa.svg')).toBe(true);
  });

  it('rejects empty, null and bare filenames', () => {
    expect(isImagePath('')).toBe(false);
    expect(isImagePath(null)).toBe(false);
    expect(isImagePath(undefined)).toBe(false);
    expect(isImagePath('cover.jpg')).toBe(false);
  });
});

describe('normalizeBook', () => {
  it('casts price strings to numbers', () => {
    const b = normalizeBook({ price: '70.00', old_price: '85.50', title_ar: 'x' });
    expect(b.price).toBe(70);
    expect(b.old_price).toBe(85.5);
  });

  it('defaults missing prices and nulls empty old_price', () => {
    const b = normalizeBook({ title_ar: 'x' });
    expect(b.price).toBe(0);
    expect(b.old_price).toBeNull();
  });

  it('preserves all other fields', () => {
    const b = normalizeBook({ id: '1', title_ar: 'الداء والدواء', price: 70 });
    expect(b.id).toBe('1');
    expect(b.title_ar).toBe('الداء والدواء');
  });
});
