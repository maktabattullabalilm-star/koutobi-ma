/**
 * Pure catalog helpers (unit-tested). The admin UI stays thin;
 * all ordering math lives here.
 */

/** Book column that stores values of an attribute type. */
export const ATTRIBUTE_COLUMNS = {
  binding: 'binding_ar',
  size: 'size_ar',
  paper: 'paper_ar',
};

/**
 * Reorder helper for admin lists (categories, attribute options).
 * Moves the item with `id` one step in `dir` (+1 down, -1 up) and
 * returns the full list with normalized sorts (10, 20, 30…).
 * Returns null when the move is impossible (edges, unknown id).
 */
export function reorderList(list, id, dir) {
  const ix = list.findIndex((r) => r.id === id);
  const jx = ix + dir;
  if (ix < 0 || jx < 0 || jx >= list.length) return null;
  const next = [...list];
  [next[ix], next[jx]] = [next[jx], next[ix]];
  return next.map((r, i) => ({ ...r, sort: (i + 1) * 10 }));
}

/** Sort value for an appended row (goes last). */
export function nextSort(list) {
  const max = list.reduce((m, r) => Math.max(m, Number(r.sort) || 0), 0);
  return max + 10;
}

/** Count books per value of a book column. Returns { value: count }. */
export function countByColumn(books, column) {
  const counts = {};
  for (const b of books || []) {
    const v = b?.[column];
    if (v) counts[v] = (counts[v] || 0) + 1;
  }
  return counts;
}
