import { describe, expect, it } from 'vitest';
import { ATTRIBUTE_COLUMNS, countByColumn, nextSort, reorderList, swapAdjacent } from './catalog';

const ROWS = [
  { id: 'a', value_ar: 'أ', sort: 10 },
  { id: 'b', value_ar: 'ب', sort: 20 },
  { id: 'c', value_ar: 'ج', sort: 30 },
];

describe('reorderList', () => {
  it('moves an item down and normalizes sorts', () => {
    const out = reorderList(ROWS, 'a', 1);
    expect(out.map((r) => r.id)).toEqual(['b', 'a', 'c']);
    expect(out.map((r) => r.sort)).toEqual([10, 20, 30]);
  });

  it('moves an item up', () => {
    const out = reorderList(ROWS, 'c', -1);
    expect(out.map((r) => r.id)).toEqual(['a', 'c', 'b']);
  });

  it('refuses moves past the edges and unknown ids', () => {
    expect(reorderList(ROWS, 'a', -1)).toBeNull();
    expect(reorderList(ROWS, 'c', 1)).toBeNull();
    expect(reorderList(ROWS, 'zzz', 1)).toBeNull();
    expect(reorderList([], 'a', 1)).toBeNull();
  });

  it('does not mutate the input', () => {
    reorderList(ROWS, 'a', 1);
    expect(ROWS.map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('swapAdjacent', () => {
  it('swaps by uid key (gallery use-case) without touching sorts', () => {
    const gallery = [
      { uid: 'u1', sort: 5 },
      { uid: 'u2', sort: 5 },
    ];
    const out = swapAdjacent(gallery, 'u1', 1, 'uid');
    expect(out.map((r) => r.uid)).toEqual(['u2', 'u1']);
    expect(out.map((r) => r.sort)).toEqual([5, 5]);
  });

  it('returns null on impossible moves', () => {
    expect(swapAdjacent(ROWS, 'a', -1)).toBeNull();
    expect(swapAdjacent(ROWS, 'zzz', 1)).toBeNull();
  });
});

describe('nextSort', () => {
  it('appends after the max sort', () => {
    expect(nextSort(ROWS)).toBe(40);
    expect(nextSort([])).toBe(10);
    expect(nextSort([{ sort: 0 }])).toBe(10);
  });
});

describe('countByColumn', () => {
  it('counts books per column value, skipping empties', () => {
    const books = [{ category: 'فقه' }, { category: 'فقه' }, { category: 'توحيد' }, { category: '' }, {}];
    expect(countByColumn(books, 'category')).toEqual({ فقه: 2, توحيد: 1 });
  });

  it('maps attribute types to book columns', () => {
    expect(ATTRIBUTE_COLUMNS).toEqual({ binding: 'binding_ar', size: 'size_ar', paper: 'paper_ar' });
  });
});
