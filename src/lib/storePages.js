import { supabase } from './supabase';

export const RESERVED_PAGE_SLUGS = new Set([
  'admin', 'catalog', 'book', 'cart', 'checkout', 'thank-you', 'reset-password',
  'favicon', 'robots', 'sitemap', 'api', 'assets', 'covers',
]);

export function normalizePageSlug(value) {
  return String(value || '').trim().toLowerCase();
}

export function validatePageSlug(value) {
  const slug = normalizePageSlug(value);
  if (!slug) return 'أدخل رابط الصفحة.';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return 'استخدم أحرفاً إنجليزية صغيرة وأرقاماً، وافصل الكلمات بشرطة مثل shipping-information.';
  if (RESERVED_PAGE_SLUGS.has(slug)) return 'هذا الرابط محجوز لصفحة أساسية في المتجر.';
  return '';
}

function throwDb(error) {
  if (error) throw new Error(error.message || 'تعذّر حفظ الصفحة');
}

export async function adminGetStorePages() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('store_pages').select('*').order('is_system', { ascending: false }).order('title');
  throwDb(error);
  return data || [];
}

export async function getVisibleStorePages() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('store_pages').select('slug,title').eq('is_visible', true).order('title');
  if (error) return [];
  return data || [];
}

export async function getStorePage(slug) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('store_pages').select('slug,title,meta_description,content_markdown,is_visible').eq('slug', normalizePageSlug(slug)).eq('is_visible', true).maybeSingle();
  if (error) return null;
  return data || null;
}

export async function adminSaveStorePage(page) {
  const payload = {
    title: String(page.title || '').trim(),
    slug: normalizePageSlug(page.slug),
    meta_description: String(page.meta_description || '').trim(),
    content_markdown: String(page.content_markdown || ''),
    is_visible: Boolean(page.is_visible),
    is_system: Boolean(page.is_system),
    updated_at: new Date().toISOString(),
  };
  if (!payload.title || payload.title.length > 160) throw new Error('أدخل عنواناً من 1 إلى 160 حرفاً.');
  if (payload.meta_description.length > 300) throw new Error('الوصف المختصر يجب ألا يتجاوز 300 حرف.');
  const slugError = validatePageSlug(payload.slug);
  if (slugError) throw new Error(slugError);
  if (page.id) {
    const { id, created_at: _createdAt, ...update } = { ...page, ...payload };
    const { error } = await supabase.from('store_pages').update(update).eq('id', id);
    throwDb(error);
    return { ...page, ...update };
  }
  const { data, error } = await supabase.from('store_pages').insert(payload).select().single();
  throwDb(error);
  return data;
}

export async function adminDeleteStorePage(page) {
  if (page.is_system) throw new Error('لا يمكن حذف الصفحات الأساسية. يمكنك إخفاؤها بدلاً من ذلك.');
  const { error } = await supabase.from('store_pages').delete().eq('id', page.id);
  throwDb(error);
}
