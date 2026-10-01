import { supabase } from '../supabase';
import { slugifyAr } from '../slug';

function throwDb(error) {
  throw new Error(error?.message || 'تعذّر تحميل البيانات');
}

/** Public (anon) read — used by BookForm for dropdowns. Fails open. */
export async function getCategoriesForForm() {
  const { data, error } = await supabase
    .from('categories')
    .select('name_ar')
    .order('sort', { ascending: true });
  if (error) return [];
  return (data || []).map((c) => c.name_ar);
}

/** Public (anon) read — used by BookForm for dropdowns. Fails open. */
export async function getAttributeOptionsForForm(type) {
  const { data, error } = await supabase
    .from('attribute_options')
    .select('value_ar')
    .eq('type', type)
    .order('sort', { ascending: true });
  if (error) return [];
  return (data || []).map((a) => a.value_ar);
}

export async function adminGetCategories() {
  const { data, error } = await supabase.from('categories').select('*').order('sort', { ascending: true });
  if (error) throwDb(error);
  return data || [];
}

export async function adminCreateCategory({ name_ar, sort, slug }) {
  const { data, error } = await supabase
    .from('categories')
    .insert({ name_ar, sort: sort ?? 0, slug: slug || slugifyAr(name_ar) || null })
    .select()
    .single();
  if (error) throwDb(error);
  return data;
}

export async function adminUpdateCategory(id, patch) {
  const { data, error } = await supabase.from('categories').update(patch).eq('id', id).select().single();
  if (error) throwDb(error);
  return data;
}

export async function adminDeleteCategory(id) {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throwDb(error);
}

export async function adminGetAttributeOptions(type) {
  const { data, error } = await supabase
    .from('attribute_options')
    .select('*')
    .eq('type', type)
    .order('sort', { ascending: true });
  if (error) throwDb(error);
  return data || [];
}

export async function adminCreateAttributeOption({ type, value_ar, sort }) {
  const { data, error } = await supabase
    .from('attribute_options')
    .insert({ type, value_ar, sort: sort ?? 0 })
    .select()
    .single();
  if (error) throwDb(error);
  return data;
}

export async function adminUpdateAttributeOption(id, patch) {
  const { data, error } = await supabase
    .from('attribute_options')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throwDb(error);
  return data;
}

export async function adminDeleteAttributeOption(id) {
  const { error } = await supabase.from('attribute_options').delete().eq('id', id);
  if (error) throwDb(error);
}

/**
 * Rename propagation: books store category/attribute values as plain text,
 * so renaming a catalog value must update every book using it — otherwise
 * books silently keep a name that no longer exists. Returns updated count.
 */
export async function adminPropagateRename(column, oldValue, newValue) {
  if (!oldValue || !newValue || oldValue === newValue) return 0;
  const { data, error } = await supabase
    .from('books')
    .update({ [column]: newValue })
    .eq(column, oldValue)
    .select('id');
  if (error) throwDb(error);
  return (data || []).length;
}

/** Reassign books from one catalog value to another (guarded delete). */
export async function adminReassignBooks(column, fromValue, toValue) {
  return adminPropagateRename(column, fromValue, toValue);
}

/** Persist a normalized order for a list of { id } rows. */
export async function adminReorderRows(table, orderedIds) {
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from(table)
      .update({ sort: (i + 1) * 10 })
      .eq('id', orderedIds[i]);
    if (error) throwDb(error);
  }
}
