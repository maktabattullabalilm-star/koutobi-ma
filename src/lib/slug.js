/**
 * Arabic → Latin slug helper (docs/backlog/27). Used for future ASCII
 * category/book slugs (canonical URLs); Arabic names stay the display truth.
 */
const AR_MAP = {
  ا: 'a',
  أ: 'a',
  إ: 'i',
  آ: 'aa',
  ب: 'b',
  ت: 't',
  ث: 'th',
  ج: 'j',
  ح: 'h',
  خ: 'kh',
  د: 'd',
  ذ: 'dh',
  ر: 'r',
  ز: 'z',
  س: 's',
  ش: 'sh',
  ص: 's',
  ض: 'd',
  ط: 't',
  ظ: 'z',
  ع: 'a',
  غ: 'gh',
  ف: 'f',
  ق: 'q',
  ك: 'k',
  ل: 'l',
  م: 'm',
  ن: 'n',
  ه: 'h',
  و: 'w',
  ي: 'y',
  ى: 'a',
  ة: 'a',
  ؤ: 'u',
  ئ: 'i',
  ء: 'a',
  'ً': '',
  'ٌ': '',
  'ٍ': '',
  'َ': '',
  'ُ': '',
  'ِ': '',
  'ّ': '',
  'ْ': '',
  ـ: '',
};

export function slugifyAr(value) {
  return String(value || '')
    .trim()
    .split('')
    .map((ch) => {
      if (/[a-zA-Z0-9]/.test(ch)) return ch.toLowerCase();
      if (AR_MAP[ch] !== undefined) return AR_MAP[ch];
      if (/\s/.test(ch)) return '-';
      return '';
    })
    .join('')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}
