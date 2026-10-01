import { supabase } from '../supabase';

/** Max rows per admin list call — bounds the old fetch-everything pattern. */
export const ADMIN_PAGE_SIZE = 500;

function throwDb(error) {
  throw new Error(error?.message || 'تعذّر تحميل البيانات');
}

export async function adminGetBooks({ limit = ADMIN_PAGE_SIZE } = {}) {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throwDb(error);
  return data || [];
}

export async function adminCreateBook(payload) {
  const { data, error } = await supabase.from('books').insert(payload).select().single();
  if (error) throwDb(error);
  return data;
}

export async function adminUpdateBook(id, payload) {
  const { data, error } = await supabase
    .from('books')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throwDb(error);
  return data;
}

export async function adminDeleteBook(id) {
  const { error } = await supabase.from('books').delete().eq('id', id);
  if (error) throwDb(error);
}
