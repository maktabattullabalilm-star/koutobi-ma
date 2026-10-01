import { WHATSAPP_NUMBER } from './site';

/**
 * Environment + endpoint wiring (docs/backlog/23).
 * Shop identity lives in `./site`; DB-owned lists are read live
 * (see `lib/api.getCategories`, `lib/admin/catalog`).
 */
export const R2_PUBLIC_URL = (import.meta.env.VITE_R2_PUBLIC_URL || '').replace(/\/+$/, '');
export const UPLOAD_ENDPOINT = '/api/upload-image';
export const DELETE_IMAGE_ENDPOINT = '/api/delete-image';

export function whatsappLink(message = '', numberOverride) {
  const digits = String(numberOverride || WHATSAPP_NUMBER).replace(/[^0-9]/g, '') || WHATSAPP_NUMBER;
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}
