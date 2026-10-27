/**
 * Environment + endpoint wiring (backlog 23).
 * Store identity and contact numbers are owned by the database — never bundled.
 * DB-owned lists are read live (see `lib/api.getCategories`, `lib/admin/catalog`).
 */
export const R2_PUBLIC_URL = (import.meta.env.VITE_R2_PUBLIC_URL || '').replace(/\/+$/, '');
export const UPLOAD_ENDPOINT = '/api/upload-image';
export const DELETE_IMAGE_ENDPOINT = '/api/delete-image';

/**
 * wa.me link for a configured number. Returns null when no number is available
 * so callers can omit the link instead of rendering a dead/placeholder one.
 */
export function whatsappLink(message = '', numberOverride) {
  const digits = String(numberOverride || '').replace(/[^0-9]/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}
