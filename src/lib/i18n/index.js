/**
 * Arabic dictionary — the single home for user-facing strings (docs/backlog/27).
 * Only `ar` ships today (COD Morocco). New user-facing copy goes HERE first
 * (boy-scout rule: migrate the file you touch) so a second locale is a
 * data change, not a refactor. Validators and components import from here —
 * never duplicate the same sentence in two modules.
 */
import ar from './ar.json';

export const LOCALE = 'ar-MA';
export const CURRENCY = 'MAD';

function get(obj, path) {
  return String(path)
    .split('.')
    .reduce((o, k) => (o == null ? o : o[k]), obj);
}

/** t('order.errors.phone') → Arabic string (falls back to the key path). */
export function t(path) {
  const v = get(ar, path);
  return typeof v === 'string' || Array.isArray(v) ? v : path;
}

export { ar };
