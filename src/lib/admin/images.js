import { supabase } from '../supabase';
import { adminDeleteBook, adminGetBooks } from './books';
import { deleteR2Object } from './storage';

function throwDb(error) {
  throw new Error(error?.message || 'تعذّر تحميل البيانات');
}

export async function adminGetBookImages(bookId) {
  const { data, error } = await supabase
    .from('book_images')
    .select('*')
    .eq('book_id', bookId)
    .order('position', { ascending: true });
  if (error) throwDb(error);
  return data || [];
}

export async function adminCreateBookImage(row) {
  const { data, error } = await supabase.from('book_images').insert(row).select().single();
  if (error) throwDb(error);
  return data;
}

export async function adminUpdateBookImage(id, patch) {
  const { data, error } = await supabase.from('book_images').update(patch).eq('id', id).select().single();
  if (error) throwDb(error);
  return data;
}

export async function adminDeleteBookImage(id) {
  const { error } = await supabase.from('book_images').delete().eq('id', id);
  if (error) throwDb(error);
}

/**
 * Delete a book AND its R2 images (no wasted storage).
 * R2 deletes are best-effort: a failed object delete is reported but never
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
    } catch {
      failures.push(img.r2_key);
    }
  }
  await adminDeleteBook(id); // FK cascade removes the book_images rows
  if (failures.length) {
    throw new Error(`تم حذف الكتاب، لكن تعذّر حذف ${failures.length} صورة من التخزين — راجعها يدوياً`);
  }
}

export { adminGetBooks };
