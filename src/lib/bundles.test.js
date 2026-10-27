import { describe, expect, it } from 'vitest';
import { bundleBookCategories, bundleMatchesScope, filterBundles } from './bundles';

const makeBundle = (id, categories, title = `باقة ${id}`) => ({
  id,
  title_ar: title,
  books: categories.map((category, index) => ({
    book_id: `${id}-${index}`,
    books: { category },
  })),
});

describe('bundle categories', () => {
  it('collects the unique categories of the component books', () => {
    const bundle = makeBundle('a', ['الفقه', 'الحديث', 'الفقه']);
    expect(bundleBookCategories(bundle)).toEqual(['الفقه', 'الحديث']);
  });

  it('handles an empty or missing book list', () => {
    expect(bundleBookCategories({ books: [] })).toEqual([]);
    expect(bundleBookCategories({})).toEqual([]);
    expect(bundleBookCategories(null)).toEqual([]);
  });

  it('matches any category in the scope and treats no scope as all', () => {
    const bundle = makeBundle('a', ['الفقه']);
    expect(bundleMatchesScope(bundle, ['الحديث', 'الفقه'])).toBe(true);
    expect(bundleMatchesScope(bundle, ['الحديث'])).toBe(false);
    expect(bundleMatchesScope(bundle, undefined)).toBe(true);
    expect(bundleMatchesScope(bundle, [])).toBe(false);
  });
});

describe('filterBundles', () => {
  const bundles = [makeBundle('a', ['الفقه'], 'باقة الفقه'), makeBundle('b', ['الحديث'], 'باقة الحديث')];

  it('hides bundles in a books-only view', () => {
    expect(filterBundles(bundles, { type: 'books' })).toEqual([]);
  });

  it('shows matching bundles inside a category', () => {
    const result = filterBundles(bundles, { type: 'all', scope: ['الحديث'] });
    expect(result.map((bundle) => bundle.id)).toEqual(['b']);
  });

  it('shows every bundle on the packs view', () => {
    expect(filterBundles(bundles, { type: 'packs' })).toHaveLength(2);
  });

  it('filters packs by title when searching', () => {
    expect(filterBundles(bundles, { type: 'packs', q: 'الفقه' })).toHaveLength(1);
  });

  it('keeps search results books-only in the mixed view', () => {
    expect(filterBundles(bundles, { type: 'all', q: 'الفقه' })).toEqual([]);
  });
});
