export const R2_PUBLIC_URL = (import.meta.env.VITE_R2_PUBLIC_URL || '').replace(/\/+$/, '');
export const UPLOAD_ENDPOINT = '/api/upload-image';
export const DELETE_IMAGE_ENDPOINT = '/api/delete-image';
export const STORE_NAME = 'مكتبة كُتُبِي';
export const WHATSAPP_NUMBER = '212624182004';
export const PHONE_DISPLAY = '+212 624-182004';

export const CATEGORIES = [
  { name: 'العقيدة والتوحيد', slug: 'العقيدة والتوحيد' },
  { name: 'التفسير وعلوم القرآن', slug: 'التفسير وعلوم القرآن' },
  { name: 'الفقه وأصوله', slug: 'الفقه وأصوله' },
  { name: 'الحديث وعلومه', slug: 'الحديث وعلومه' },
  { name: 'الرقائق والأخلاق', slug: 'الرقائق والأخلاق' },
  { name: 'الأذكار والأدعية', slug: 'الأذكار والأدعية' },
];

export function whatsappLink(message = '') {
  return `https://wa.me/${WHATSAPP_NUMBER.replace(/[^0-9]/g, '')}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}