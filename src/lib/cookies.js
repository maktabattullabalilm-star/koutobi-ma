import { STORAGE_KEYS } from './constants';

/**
 * Cookie-consent model (GDPR / Moroccan CNDP Law 09-08).
 * Three categories; only "necessary" is ever active without consent.
 * The inventory below mirrors what the code actually stores/loads —
 * keep it in sync when adding analytics or marketing vendors.
 */

export const CONSENT_KEY = 'koutobi_cookie_consent_v1';
export const CONSENT_VERSION = 1;
/** Months a recorded choice stays valid before re-prompting. */
export const CONSENT_MONTHS = 12;

export const CATEGORIES = [
  { id: 'necessary', label: 'ضرورية', locked: true },
  { id: 'statistics', label: 'إحصائية', locked: false },
  { id: 'marketing', label: 'تسويقية', locked: false },
];

/**
 * Truthful per-category inventory: { name, storage, purpose, expiry }.
 * "No vendor active" rows keep Statistics/Marketing honest until a
 * vendor is added (which must then gate on isConsented(category)).
 */
export const COOKIE_INVENTORY = {
  necessary: [
    {
      name: STORAGE_KEYS.cart,
      storage: 'التخزين المحلي',
      purpose: 'حفظ محتوى سلة التسوق على جهازك',
      expiry: 'دائم حتى مسحه',
    },
    {
      name: `${STORAGE_KEYS.lastOrder} (جلسة)`,
      storage: 'تخزين الجلسة',
      purpose: 'عرض تأكيد الطلب مرة واحدة ثم يُحذف تلقائياً',
      expiry: 'نهاية الجلسة',
    },
    {
      name: 'sb-…-auth-token',
      storage: 'التخزين المحلي (المدير فقط)',
      purpose: 'إبقاء جلسة دخول مدير المتجر',
      expiry: 'حتى تسجيل الخروج',
    },
    {
      name: CONSENT_KEY,
      storage: 'التخزين المحلي',
      purpose: 'تذكّر اختيارك لملفات الارتباط',
      expiry: `${CONSENT_MONTHS} شهراً`,
    },
    {
      name: 'ذاكرة التخزين المؤقت (Service Worker)',
      storage: 'Cache Storage',
      purpose: 'عمل المتجر دون اتصال وتسريع التحميل',
      expiry: 'حتى تحديث النسخة',
    },
  ],
  statistics: [
    {
      name: 'لا يوجد مورّد نشط',
      storage: '—',
      purpose: 'تفعيل هذا الخيار يسمح مستقبلاً بأدوات قياس مجهولة المصدر فقط',
      expiry: '—',
    },
  ],
  marketing: [
    {
      name: 'لا يوجد مورّد نشط',
      storage: '—',
      purpose: 'أزرار واتساب روابط خارجية مباشرة بدون تتبّع؛ لن يُفعَّل أي إعلان دون موافقتك',
      expiry: '—',
    },
  ],
};

function freshExpiry() {
  const d = new Date();
  d.setMonth(d.getMonth() + CONSENT_MONTHS);
  return d.toISOString();
}

/** Read the stored choice; null when missing, outdated, or expired. */
export function getConsent() {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== CONSENT_VERSION) return null;
    if (!parsed?.expiresAt || new Date(parsed.expiresAt) <= new Date()) return null;
    return {
      statistics: !!parsed.statistics,
      marketing: !!parsed.marketing,
      savedAt: parsed.savedAt || null,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}

function persist(choice) {
  const record = {
    version: CONSENT_VERSION,
    statistics: !!choice.statistics,
    marketing: !!choice.marketing,
    savedAt: new Date().toISOString(),
    expiresAt: freshExpiry(),
  };
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
  } catch {
    /* private mode — choice applies to this session only */
  }
  window.dispatchEvent(new CustomEvent('koutobi:consent', { detail: record }));
  return record;
}

export const acceptAllCookies = () => persist({ statistics: true, marketing: true });
export const rejectOptionalCookies = () => persist({ statistics: false, marketing: false });
export const saveCustomCookies = (choice) => persist(choice);

/** Necessary is always allowed; others require a stored opt-in. */
export function isConsented(category) {
  if (category === 'necessary') return true;
  return getConsent()?.[category] === true;
}

/**
 * Gate for future non-necessary vendors: run loader only with consent,
 * and re-run automatically if the visitor opts in later.
 * Returns an unsubscribe function.
 */
export function whenConsented(category, loader) {
  if (category !== 'statistics' && category !== 'marketing') {
    throw new Error('unknown consent category');
  }
  let done = false;
  const run = () => {
    if (!done && isConsented(category)) {
      done = true;
      loader();
    }
  };
  run();
  const onChange = () => run();
  window.addEventListener('koutobi:consent', onChange);
  return () => window.removeEventListener('koutobi:consent', onChange);
}

/** Ask the banner to reopen (e.g. from the footer "cookie settings" link). */
export function openCookiePreferences() {
  window.dispatchEvent(new CustomEvent('koutobi:open-cookie-preferences'));
}
