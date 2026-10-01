import { describe, expect, it } from 'vitest';
import { normalizePageSlug, RESERVED_PAGE_SLUGS, validatePageSlug } from './storePages';

describe('store page slugs', () => {
  it('normalizes English slugs and allows lower-case hyphenated values', () => {
    expect(normalizePageSlug('  Shipping-Information ')).toBe('shipping-information');
    expect(validatePageSlug('shipping-information')).toBe('');
    expect(validatePageSlug('faq2')).toBe('');
  });

  it('rejects Arabic, spaces, and malformed separators', () => {
    for (const slug of ['معلومات-الشحن', 'has space', '-start', 'end-', 'double--dash', 'with_underscore']) {
      expect(validatePageSlug(slug)).toBeTruthy();
    }
  });

  it('blocks application route slugs', () => {
    for (const slug of RESERVED_PAGE_SLUGS) expect(validatePageSlug(slug)).toBeTruthy();
  });
});
