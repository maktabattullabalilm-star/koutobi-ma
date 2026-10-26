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

/** Edition attribute types and their Arabic labels (shared admin/storefront). */
export const EDITION_SPEC_TYPES = ['binding', 'size', 'paper'];
export const EDITION_SPEC_LABELS = {
  binding: 'التجليد',
  size: 'المقاس',
  paper: 'الورق',
};

/** app_settings key holding the edition specs hidden from the public book page. */
export const HIDDEN_EDITION_SPECS_KEY = 'hidden_edition_specs';

/**
 * Swap the item with `id` one step in `dir` (+1 down, -1 up).
 * Returns the swapped list, or null when the move is impossible.
 * Pure — the single home for reorder math (docs/backlog/22).
 */
export function swapAdjacent(list, id, dir, key = 'id') {
  const ix = list.findIndex((r) => r[key] === id);
  const jx = ix + dir;
  if (ix < 0 || jx < 0 || jx >= list.length) return null;
  const next = [...list];
  [next[ix], next[jx]] = [next[jx], next[ix]];
  return next;
}

/**
 * Reorder helper for admin lists (categories, attribute options).
 * Moves the item with `id` one step in `dir` (+1 down, -1 up) and
 * returns the full list with normalized sorts (10, 20, 30…).
 * Returns null when the move is impossible (edges, unknown id).
 */
export function reorderList(list, id, dir) {
  const next = swapAdjacent(list, id, dir);
  if (!next) return null;
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

/**
 * Parse the `hidden_edition_specs` setting. Accepts the current JSON array
 * form and the legacy comma-separated form; unknown types are discarded.
 */
export function parseHiddenEditionSpecs(value) {
  if (!value) return [];
  let list = [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) list = parsed;
  } catch {
    list = String(value).split(',');
  }
  const wanted = new Set(list.map((v) => String(v).trim()));
  return EDITION_SPEC_TYPES.filter((type) => wanted.has(type));
}

/** Rows may come from the DB (`name_ar`/`parent_id`) or the public API (`name`/`parentId`). */
const rowName = (row) => row?.name_ar ?? row?.name ?? '';
const rowParentId = (row) => row?.parent_id ?? row?.parentId ?? null;

/**
 * Accept legacy string lists (offline fallbacks/tests) as root category rows,
 * so every consumer can assume `{ id, name_ar, parent_id, sort }`.
 */
export function normalizeCategoryRows(list = [], prefix = 'fallback') {
  return (list || []).map((item, index) =>
    typeof item === 'string'
      ? { id: `${prefix}-${index}`, name_ar: item, parent_id: null, sort: (index + 1) * 10 }
      : item
  );
}

/**
 * Build a category tree from flat rows. Unlimited depth; siblings are sorted
 * by `sort` (then name). Rows whose parent is missing become roots, which keeps
 * a corrupt/partial fetch renderable instead of hiding categories.
 */
export function buildCategoryTree(rows = []) {
  const byId = new Map();
  const roots = [];
  const nodes = (rows || []).map((row) => ({ ...row, children: [] }));
  nodes.forEach((node) => byId.set(node.id, node));
  // Attaching a node under its own descendant would create a cycle; such a
  // node is kept as a root instead of disappearing from the tree.
  const isAncestor = (candidateId, startNode) => {
    let parentId = rowParentId(startNode);
    const seen = new Set();
    while (parentId && !seen.has(parentId)) {
      if (parentId === candidateId) return true;
      seen.add(parentId);
      parentId = rowParentId(byId.get(parentId));
    }
    return false;
  };
  nodes.forEach((node) => {
    const parentId = rowParentId(node);
    const parent = parentId ? byId.get(parentId) : null;
    if (parent && parent !== node && !isAncestor(node.id, parent)) parent.children.push(node);
    else roots.push(node);
  });
  const bySort = (a, b) =>
    (Number(a.sort) || 0) - (Number(b.sort) || 0) || rowName(a).localeCompare(rowName(b), 'ar');
  const prune = (list) => {
    list.sort(bySort);
    list.forEach((node) => prune(node.children));
    return list;
  };
  return prune(roots);
}

/** Depth-first flat list with a `depth` field, in display order. */
export function flattenCategoryTree(roots = []) {
  const out = [];
  const walk = (nodes, depth) => {
    (nodes || []).forEach((node) => {
      out.push({ ...node, depth });
      walk(node.children, depth + 1);
    });
  };
  walk(roots, 0);
  return out;
}

/** The category itself plus every descendant name (for storefront filtering). */
export function categoryScopeNames(rows = [], name) {
  if (!name) return [];
  const byName = new Map((rows || []).map((row) => [rowName(row), row]));
  const byParentId = new Map();
  (rows || []).forEach((row) => {
    const key = rowParentId(row);
    if (!byParentId.has(key)) byParentId.set(key, []);
    byParentId.get(key).push(row);
  });
  const out = [];
  const walk = (nodeName) => {
    const node = byName.get(nodeName);
    if (!node || out.includes(nodeName)) return;
    out.push(nodeName);
    (byParentId.get(node.id) || []).forEach((child) => walk(rowName(child)));
  };
  walk(name);
  return out;
}

/** Root → … → category ancestor chain (inclusive). Guards against cycles. */
export function categoryPath(rows = [], name) {
  if (!name) return [];
  const byName = new Map((rows || []).map((row) => [rowName(row), row]));
  const byId = new Map((rows || []).map((row) => [row.id, row]));
  const seen = new Set();
  const path = [];
  let current = byName.get(name);
  while (current && !seen.has(rowName(current))) {
    seen.add(rowName(current));
    path.unshift(current);
    const parentId = rowParentId(current);
    current = parentId ? byId.get(parentId) : null;
  }
  return path;
}

/** Self + every descendant id (used to disable cycle-creating parent moves). */
export function categorySubtreeIds(rows = [], id) {
  const ids = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    (rows || []).forEach((row) => {
      const parentId = rowParentId(row);
      if (parentId && ids.has(parentId) && !ids.has(row.id)) {
        ids.add(row.id);
        changed = true;
      }
    });
  }
  return ids;
}

/** Rows under a given parent (null = roots), in display order. */
export function categorySiblings(rows = [], parentId = null) {
  const key = parentId || null;
  return (rows || [])
    .filter((row) => rowParentId(row) === key)
    .sort(
      (a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0) || rowName(a).localeCompare(rowName(b), 'ar')
    );
}
