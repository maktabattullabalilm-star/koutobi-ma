const SOCIAL_DOMAINS = {
  facebook: ['facebook.com', 'fb.com'],
  instagram: ['instagram.com'],
  tiktok: ['tiktok.com'],
  x: ['x.com', 'twitter.com'],
  twitter: ['x.com', 'twitter.com'],
  youtube: ['youtube.com', 'youtu.be'],
};

export function verifySocialUrl(network, value) {
  if (!String(value || '').trim()) return { valid: true, empty: true };
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    return { valid: false, message: 'أدخل رابطاً كاملاً يبدأ بـ https://' };
  }
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) {
    return { valid: false, message: 'الرابط يجب أن يكون آمناً ويبدأ بـ https://' };
  }
  const platform = String(network || '').trim().toLowerCase();
  const domains = SOCIAL_DOMAINS[platform];
  if (domains && !domains.some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`))) {
    return { valid: false, message: `هذا الرابط ليس من نطاق ${network} الرسمي` };
  }
  return { valid: true, empty: false };
}
