/**
 * Shop identity + offline fallbacks (docs/backlog/23).
 * The DATABASE is the source of truth for categories/attributes/settings.
 * These constants are used ONLY when the DB read fails (offline/demo) —
 * every fallback use logs a drift warning so divergence gets noticed.
 */

export const STORE_NAME = 'مكتبة كُتُبِي';
export const WHATSAPP_NUMBER = '212624182004';
export const PHONE_DISPLAY = '+212 624-182004';

/** Last-resort category list (DB `categories` table is canonical). */
export const FALLBACK_CATEGORIES = [
  'العقيدة والتوحيد',
  'التفسير وعلوم القرآن',
  'الفقه وأصوله',
  'الحديث وعلومه',
  'الرقائق والأخلاق',
  'الأذكار والأدعية',
];

export function warnFallback(what) {
  if (typeof console !== 'undefined') {
    console.warn(`[koutobi] using offline fallback for ${what} — DB read failed (possible drift)`);
  }
}
