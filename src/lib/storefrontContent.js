import { supabase } from './supabase';

/**
 * Empty shapes for every editable storefront section.
 *
 * The database is the ONLY source of storefront copy. These shapes exist so the
 * admin editor always has a complete object to edit; they deliberately contain
 * no store name, contact details, testimonials or marketing copy. A section
 * with no DB row is returned as `visible: false` and therefore renders nothing.
 *
 * Brand colours are a neutral palette (design tokens, not store identity) so
 * the UI stays styled before/without a brand row.
 */
export const CONTENT_SHAPES = {
  home_hero: {
    badge: '',
    title: '',
    description: '',
    shop_label: '',
    how_label: '',
    stats: [],
  },
  home_categories: {
    title: '',
    description: '',
    link_label: '',
  },
  home_newest: {
    title: '',
    description: '',
    link_label: '',
  },
  home_featured: {
    title: '',
    description: '',
    link_label: '',
  },
  home_how: {
    title: '',
    description: '',
    items: [],
  },
  home_features: {
    items: [],
  },
  home_testimonials: {
    title: '',
    items: [],
  },
  home_cta: {
    title: '',
    description: '',
    shop_label: '',
    whatsapp_label: '',
    note: '',
  },
  product_page: {
    price_badge: '',
    tax_note: '',
    add_label: '',
    buy_label: '',
    support: '',
    details_title: '',
    specs_title: '',
    related_title: '',
  },
  footer: {
    contact_title: '',
    contact_description: '',
    about: '',
  },
  announcement: {
    messages: [],
  },
  brand: {
    logo_url: '',
    logo_mark: '',
    logo_name: '',
    logo_suffix: '',
    contact_email: '',
    primary_color: '#35724e',
    primary_dark: '#2b5c40',
    primary_darker: '#234b35',
    primary_light: '#e8f2ec',
    primary_pale: '#f4f9f5',
    socials: [],
  },
};

function hiddenSections() {
  return Object.fromEntries(
    Object.entries(CONTENT_SHAPES).map(([key, content]) => [key, { content: { ...content }, visible: false }])
  );
}

/**
 * Live storefront content. Missing rows are hidden — never replaced with
 * bundled copy. A failed read hides everything instead of showing stale demo
 * content; the network guard and page-level errors explain what happened.
 */
export async function getStorefrontContent() {
  if (!supabase) return hiddenSections();
  try {
    const { data, error } = await supabase.from('storefront_content').select('key,content,visible');
    if (error) throw error;
    const rows = Object.fromEntries((data || []).map((row) => [row.key, row]));
    return Object.fromEntries(
      Object.entries(CONTENT_SHAPES).map(([key, shape]) => {
        const row = rows[key];
        return [
          key,
          {
            content: { ...shape, ...(row?.content || {}) },
            visible: row ? row.visible !== false : false,
          },
        ];
      })
    );
  } catch {
    return hiddenSections();
  }
}

export async function adminSaveStorefrontContent(key, content, visible) {
  const { error } = await supabase
    .from('storefront_content')
    .upsert({ key, content, visible, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw new Error(error.message || 'تعذّر حفظ المحتوى');
}
