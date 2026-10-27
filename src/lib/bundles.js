/**
 * Bundle (الباقات) helpers — pure and unit-tested.
 *
 * A bundle inherits the categories of its component books, so browsing a
 * category can also surface packs that contain books from that category.
 */

/** Unique categories of the books inside a bundle. */
export function bundleBookCategories(bundle) {
  const seen = new Set();
  (bundle?.books || []).forEach((item) => {
    const category = item?.books?.category ?? item?.category;
    if (category) seen.add(category);
  });
  return [...seen];
}

/** True when the bundle has at least one book in the scope (no scope = all). */
export function bundleMatchesScope(bundle, scope) {
  if (!Array.isArray(scope)) return true;
  if (scope.length === 0) return false;
  const wanted = new Set(scope);
  return bundleBookCategories(bundle).some((category) => wanted.has(category));
}

/**
 * Bundles visible for a catalog view.
 * - `books`: never (books-only view)
 * - `all` + search: never (search returns books only)
 * - otherwise: scoped to the selected category and, for packs, filtered by title
 */
export function filterBundles(bundles = [], { type = 'all', scope, q = '' } = {}) {
  if (type === 'books') return [];
  const needle = String(q || '')
    .trim()
    .toLowerCase();
  if (type === 'all' && needle) return [];
  return (bundles || []).filter((bundle) => {
    if (!bundleMatchesScope(bundle, scope)) return false;
    if (
      needle &&
      !String(bundle.title_ar || '')
        .toLowerCase()
        .includes(needle)
    )
      return false;
    return true;
  });
}
