import { describe, expect, it } from 'vitest';
import {
  ATTRIBUTE_COLUMNS,
  buildCategoryTree,
  categoryPath,
  categoryScopeNames,
  categorySiblings,
  categorySubtreeIds,
  countByColumn,
  flattenCategoryTree,
  nextSort,
  normalizeCategoryRows,
  parseHiddenEditionSpecs,
  reorderList,
  swapAdjacent,
} from './catalog';

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

describe('hidden edition specs', () => {
  it('parses JSON arrays and legacy comma lists in canonical order', () => {
    expect(parseHiddenEditionSpecs('["paper","size","bogus"]')).toEqual(['size', 'paper']);
    expect(parseHiddenEditionSpecs('binding,paper')).toEqual(['binding', 'paper']);
    expect(parseHiddenEditionSpecs(null)).toEqual([]);
    expect(parseHiddenEditionSpecs('')).toEqual([]);
  });
});

describe('category tree', () => {
  const CATS = [
    { id: 'quran', name_ar: 'علوم القرآن', parent_id: null, sort: 10 },
    { id: 'qiraat', name_ar: 'علم القراءات', parent_id: 'quran', sort: 10 },
    { id: 'asbab', name_ar: 'علم أسباب النزول', parent_id: 'quran', sort: 20 },
    { id: 'nahw', name_ar: 'علم النحو', parent_id: 'qiraat', sort: 10 },
    { id: 'fiqh', name_ar: 'الفقه وأصوله', parent_id: null, sort: 20 },
  ];

  it('builds unlimited-depth trees and flattens them in display order', () => {
    const tree = buildCategoryTree(CATS);
    expect(tree.map((n) => n.name_ar)).toEqual(['علوم القرآن', 'الفقه وأصوله']);
    expect(flattenCategoryTree(tree).map((n) => [n.name_ar, n.depth])).toEqual([
      ['علوم القرآن', 0],
      ['علم القراءات', 1],
      ['علم النحو', 2],
      ['علم أسباب النزول', 1],
      ['الفقه وأصوله', 0],
    ]);
  });

  it('collects a category subtree and its ancestor path', () => {
    expect(categoryScopeNames(CATS, 'علوم القرآن')).toEqual([
      'علوم القرآن',
      'علم القراءات',
      'علم النحو',
      'علم أسباب النزول',
    ]);
    expect(categoryScopeNames(CATS, 'علم النحو')).toEqual(['علم النحو']);
    expect(categoryPath(CATS, 'علم النحو').map((n) => n.name_ar)).toEqual([
      'علوم القرآن',
      'علم القراءات',
      'علم النحو',
    ]);
    expect(categorySubtreeIds(CATS, 'quran')).toEqual(new Set(['quran', 'qiraat', 'asbab', 'nahw']));
    expect(categorySiblings(CATS, 'quran').map((n) => n.name_ar)).toEqual([
      'علم القراءات',
      'علم أسباب النزول',
    ]);
  });

  it('keeps cycles renderable instead of hiding rows', () => {
    const tree = buildCategoryTree([
      { id: 'a', name_ar: 'أ', parent_id: 'b', sort: 10 },
      { id: 'b', name_ar: 'ب', parent_id: 'a', sort: 20 },
    ]);
    expect(tree.map((n) => n.name_ar)).toEqual(['أ', 'ب']);
  });

  it('normalizes legacy string lists', () => {
    expect(normalizeCategoryRows(['فقه', 'توحيد'])).toEqual([
      { id: 'fallback-0', name_ar: 'فقه', parent_id: null, sort: 10 },
      { id: 'fallback-1', name_ar: 'توحيد', parent_id: null, sort: 20 },
    ]);
  });

  it('accepts the public API shape (name/parentId)', () => {
    const publicRows = [
      { id: 'q', name: 'علوم القرآن', parentId: null, depth: 0 },
      { id: 'r', name: 'القراءات', parentId: 'q', depth: 1 },
    ];
    expect(categoryScopeNames(publicRows, 'علوم القرآن')).toEqual(['علوم القرآن', 'القراءات']);
    expect(categoryPath(publicRows, 'القراءات').map((n) => n.name)).toEqual(['علوم القرآن', 'القراءات']);
  });
});
