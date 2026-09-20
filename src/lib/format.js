export function formatPrice(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return new Intl.NumberFormat('ar-MA', { maximumFractionDigits: 2 }).format(Number(n)) + ' درهم';
}

export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return new Intl.DateTimeFormat('ar-MA', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
}

export function isImagePath(v) {
  return Boolean(v && (v.startsWith('http') || v.startsWith('/')));
}

export function normalizeBook(row) {
  return {
    ...row,
    price: Number(row.price || 0),
    old_price: row.old_price ? Number(row.old_price) : null,
    images: Array.isArray(row.images) ? row.images : [],
  };
}

/**
 * Single source of truth for availability. A book is sold out when the admin
 * flagged it manually OR its stock ran out. Unknown stock (demo/sample rows
 * without stock_qty) never counts as sold out.
 */
export function isSoldOut(book) {
  if (!book) return true;
  if (book.is_out_of_stock) return true;
  if (book.stock_qty == null) return false;
  return Number(book.stock_qty) <= 0;
}