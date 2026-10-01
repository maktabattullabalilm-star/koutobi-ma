import { supabase } from '../supabase';
import { ADMIN_PAGE_SIZE } from './books';

function throwDb(error) {
  throw new Error(error?.message || 'تعذّر تحميل البيانات');
}

/** Read a single app_setting value. Fails open (null). */
export async function getAppSetting(key) {
  const { data, error } = await supabase.from('app_settings').select('value').eq('key', key).maybeSingle();
  if (error) return null;
  return data?.value ?? null;
}

/** Update an app_setting (admin only). Upserts so new keys work without a migration. */
export async function adminUpdateAppSetting(key, value) {
  const { error } = await supabase.from('app_settings').upsert({ key, value }, { onConflict: 'key' });
  if (error) throwDb(error);
}

/** Append-only inventory ledger, visible only to an admin. */
export async function adminGetStockMovements({ bookId, from = 0, limit = ADMIN_PAGE_SIZE } = {}) {
  let query = supabase.from('stock_movements').select('*, profiles(email)').order('created_at', { ascending: false }).range(from, from + limit - 1);
  if (bookId) query = query.eq('book_id', bookId);
  const { data, error } = await query;
  if (error) throwDb(error);
  return data || [];
}

/** Apply one audited stock movement or set an exact count atomically. */
export async function adminAdjustStock({ bookId, delta = 0, targetQty = null, reason, note = '' }) {
  const { data, error } = await supabase.rpc('admin_adjust_stock', {
    p_book_id: bookId,
    p_delta: delta,
    p_target_qty: targetQty,
    p_reason: reason,
    p_note: note || null,
  });
  if (error) throwDb(error);
  return data;
}

/** Atomic all-or-nothing bulk restock. */
export async function adminBulkStockIn({ items, reason = 'restock', note = '' }) {
  const { data, error } = await supabase.rpc('admin_bulk_stock_in', {
    p_items: items,
    p_reason: reason,
    p_note: note || null,
  });
  if (error) throwDb(error);
  return data || [];
}
