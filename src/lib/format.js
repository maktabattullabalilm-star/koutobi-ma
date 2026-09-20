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
  return { ...row, price: Number(row.price || 0), old_price: row.old_price ? Number(row.old_price) : null };
}