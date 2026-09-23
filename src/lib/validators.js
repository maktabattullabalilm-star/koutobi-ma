import { t } from './i18n';

/** ISBN checksum validation (format-only — the lookup flow is gone). */
export function normalizeIsbn(value) {
  return String(value || '')
    .replace(/[\s-]+/g, '')
    .toUpperCase();
}

function isValidIsbn10(v) {
  if (!/^\d{9}[\dX]$/.test(v)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += (v[i] === 'X' ? 10 : Number(v[i])) * (10 - i);
  }
  return sum % 11 === 0;
}

function isValidIsbn13(v) {
  if (!/^\d{13}$/.test(v)) return false;
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += Number(v[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return sum % 10 === 0;
}

export function isValidIsbn(value) {
  const v = normalizeIsbn(value);
  return isValidIsbn10(v) || isValidIsbn13(v);
}

/** Moroccan phone: digits normalized, must be 212/0 + [5-7] + 8 digits. */
export function normalizePhoneDigits(phone) {
  return String(phone || '').replace(/[^0-9]/g, '');
}

export function isValidMaPhone(phone) {
  return /^((212|0)[5-7][0-9]{8})$/.test(normalizePhoneDigits(phone));
}

export function sanitizeTelHref(phone) {
  return `tel:${String(phone || '').replace(/[^0-9+]/g, '')}`;
}

/** Mask middle digits for admin lists: 0612345678 → 06•••5678. */
export function maskPhone(phone) {
  const d = normalizePhoneDigits(phone);
  if (d.length < 9) return '••••••';
  return `${d.slice(0, 2)}•••${d.slice(-4)}`;
}

const ORDER_LIMITS = {
  name: [3, 100],
  address: [8, 500],
  city: [2, 100],
  notes: [0, 1000],
};

/** Returns {field: message} (empty = valid). Mirrors server CHECKs (docs/backlog/08). */
export function validateOrder({ name = '', phone = '', city = '', address = '', notes = '' } = {}) {
  const e = {};
  const n = name.trim();
  if (n.length < ORDER_LIMITS.name[0] || n.length > ORDER_LIMITS.name[1]) e.name = t('order.errors.name');
  if (!isValidMaPhone(phone)) e.phone = t('order.errors.phone');
  const a = address.trim();
  if (a.length < ORDER_LIMITS.address[0] || a.length > ORDER_LIMITS.address[1])
    e.address = t('order.errors.address');
  const c = city.trim();
  if (c && (c.length < ORDER_LIMITS.city[0] || c.length > ORDER_LIMITS.city[1]))
    e.city = t('order.errors.city');
  if (notes.trim().length > ORDER_LIMITS.notes[1]) e.notes = t('order.errors.notes');
  return e;
}

function isIntIn(v, min, max) {
  if (v === '' || v === null || v === undefined) return false;
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max;
}

/**
 * Book validation for admin save. Returns {field: [message, section]} to match
 * BookForm's error-summary shape. `categories` = allowed category names (DB list).
 */
export function validateBook(form = {}, { categories = [] } = {}) {
  const errs = {};
  if (!String(form.title_ar || '').trim()) errs.title_ar = ['عنوان الكتاب مطلوب', 'sec-info'];
  if (!String(form.category || '').trim()) {
    errs.category = ['اختر التصنيف من القائمة', 'sec-info'];
  } else if (categories.length && !categories.includes(form.category)) {
    errs.category = ['التصنيف المختار غير موجود — حدّث القائمة وحاول مجددًا', 'sec-info'];
  }
  const price = Number(form.price);
  if (form.price === '' || Number.isNaN(price) || price < 0 || price > 99999) {
    errs.price = ['أدخل سعرًا صحيحًا (0 – 99999)', 'sec-info'];
  }
  if (form.old_price !== '' && form.old_price != null) {
    const old = Number(form.old_price);
    if (Number.isNaN(old) || old <= price)
      errs.old_price = ['السعر القديم يجب أن يكون أكبر من السعر الحالي', 'sec-info'];
  }
  if (form.pages !== '' && form.pages != null && !isIntIn(form.pages, 0, 10000)) {
    errs.pages = ['عدد الصفحات يجب أن يكون رقمًا صحيحًا (0 – 10000)', 'sec-edition'];
  }
  if (form.stock_qty !== '' && form.stock_qty != null && !isIntIn(form.stock_qty, 0, 9999)) {
    errs.stock_qty = ['المخزون يجب أن يكون رقمًا صحيحًا (0 – 9999)', 'sec-edition'];
  }
  const isbn = String(form.isbn || '').trim();
  if (isbn && !isValidIsbn(isbn)) errs.isbn = ['رقم ISBN غير صالح — تحقق من الرقم', 'sec-edition'];
  for (const [key, section] of [['cover_image', 'sec-gallery']]) {
    const url = String(form[key] || '').trim();
    if (!url) continue;
    if (url.length > 2048) errs[key] = ['رابط الصورة طويل جدًا', section];
    else if (!/^https:\/\//i.test(url)) errs[key] = ['رابط الصورة يجب أن يبدأ بـ https://', section];
  }
  return errs;
}
