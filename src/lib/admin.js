import { supabase } from './supabase';
import { DELETE_IMAGE_ENDPOINT, UPLOAD_ENDPOINT } from './config';
import { isDeletableR2Key } from './images';

export async function adminGetBooks() {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function adminCreateBook(payload) {
  const { data, error } = await supabase.from('books').insert(payload).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function adminUpdateBook(id, payload) {
  const { data, error } = await supabase
    .from('books')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function adminDeleteBook(id) {
  const { error } = await supabase.from('books').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ---------- R2 storage (via Netlify functions, admin JWT + RLS) ----------

/**
 * Upload a file to R2. Payload contract matches
 * netlify/functions/upload-image.mjs: { file: { name, type, base64 } }.
 */
export async function uploadR2File({ name, type, base64 }, accessToken) {
  const res = await fetch(UPLOAD_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken || ''}`,
    },
    body: JSON.stringify({ file: { name, type, base64 } }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `فشل الرفع (${res.status})`);
  if (!json.url || !json.key) throw new Error('استجابة الرفع غير مكتملة');
  return json; // { url, key }
}

/** Delete one R2 object by key. Key must live under `covers/`. */
export async function deleteR2Object(key, accessToken) {
  if (!isDeletableR2Key(key)) throw new Error('مفتاح الصورة غير صالح');
  const res = await fetch(DELETE_IMAGE_ENDPOINT, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken || ''}`,
    },
    body: JSON.stringify({ key }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `فشل حذف الصورة (${res.status})`);
  return json;
}

// ---------- Book images (gallery) ----------

export async function adminGetBookImages(bookId) {
  const { data, error } = await supabase
    .from('book_images')
    .select('*')
    .eq('book_id', bookId)
    .order('position', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function adminCreateBookImage(row) {
  const { data, error } = await supabase.from('book_images').insert(row).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function adminUpdateBookImage(id, patch) {
  const { data, error } = await supabase
    .from('book_images')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function adminDeleteBookImage(id) {
  const { error } = await supabase.from('book_images').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Delete a book AND its R2 images (no wasted storage).
 * R2 deletes are best-effort: a failed object delete warns but never
 * blocks the book delete (the orphan-sweep procedure covers leftovers).
 */
export async function adminDeleteBookWithImages(id, accessToken) {
  let images = [];
  try {
    images = await adminGetBookImages(id);
  } catch {
    images = [];
  }
  const failures = [];
  for (const img of images) {
    if (!img.r2_key) continue;
    try {
      await deleteR2Object(img.r2_key, accessToken);
    } catch (e) {
      failures.push(img.r2_key);
    }
  }
  await adminDeleteBook(id); // FK cascade removes the book_images rows
  if (failures.length) {
    throw new Error(`تم حذف الكتاب، لكن تعذّر حذف ${failures.length} صورة من التخزين — راجعها يدوياً`);
  }
}

// ---------- Catalog data (categories & attributes) ----------

/** Public (anon) read — used by BookForm for dropdowns. */
export async function getCategoriesForForm() {
  const { data, error } = await supabase
    .from('categories')
    .select('name_ar')
    .order('sort', { ascending: true });
  if (error) return [];
  return (data || []).map((c) => c.name_ar);
}

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
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function adminCreateCategory({ name_ar, sort }) {
  const { data, error } = await supabase
    .from('categories')
    .insert({ name_ar, sort: sort ?? 0 })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function adminUpdateCategory(id, patch) {
  const { data, error } = await supabase
    .from('categories')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function adminDeleteCategory(id) {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function adminGetAttributeOptions(type) {
  const { data, error } = await supabase
    .from('attribute_options')
    .select('*')
    .eq('type', type)
    .order('sort', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function adminCreateAttributeOption({ type, value_ar, sort }) {
  const { data, error } = await supabase
    .from('attribute_options')
    .insert({ type, value_ar, sort: sort ?? 0 })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function adminUpdateAttributeOption(id, patch) {
  const { data, error } = await supabase
    .from('attribute_options')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function adminDeleteAttributeOption(id) {
  const { error } = await supabase.from('attribute_options').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ---------- Stock & settings ----------

/** Call the SECURITY DEFINER RPC to decrement stock atomically. */
export async function adminDecrementStock(bookId, qty) {
  const { data, error } = await supabase.rpc('decrement_stock', { p_book_id: bookId, p_qty: qty });
  if (error) throw new Error(error.message);
  return data; // new stock_qty
}

/** Read a single app_setting value. */
export async function getAppSetting(key) {
  const { data, error } = await supabase.from('app_settings').select('value').eq('key', key).maybeSingle();
  if (error) return null;
  return data?.value ?? null;
}

/** Update an app_setting (admin only). */
export async function adminUpdateAppSetting(key, value) {
  const { error } = await supabase.from('app_settings').update({ value }).eq('key', key);
  if (error) throw new Error(error.message);
}

export async function adminGetOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function adminUpdateOrderStatus(id, status) {
  const { error } = await supabase.from('orders').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function adminStats() {
  const [books, orders] = await Promise.all([adminGetBooks(), adminGetOrders()]);
  const completed = orders.filter((o) => o.status === 'new' || o.status === 'contacted');
  const revenue = orders
    .filter((o) => o.status === 'delivered')
    .reduce((s, o) => s + Number(o.total || 0), 0);
  return {
    books: books.length,
    orders: orders.length,
    pending: completed.length,
    revenue,
  };
}