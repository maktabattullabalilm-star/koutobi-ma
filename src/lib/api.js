import { supabase, SUPABASE_ENABLED } from './supabase';
import { SAMPLE_BOOKS } from './sampleData';
import { normalizeBook } from './format';

export const DEMO_MODE = !SUPABASE_ENABLED;

async function query() {
  const sb = supabase;
  if (!sb) return null;
  let q = sb.from('books').select('*').eq('is_active', true);
  return q;
}

// ---------- Catalog (customer side) ----------

/** Attach ordered gallery rows to books. Fails open: covers keep working. */
async function attachImages(books) {
  const sb = supabase;
  if (!sb || !books.length) return books;
  try {
    const { data, error } = await sb
      .from('book_images')
      .select('*')
      .in('book_id', books.map((b) => b.id))
      .order('position', { ascending: true });
    if (error || !data) return books;
    const byBook = {};
    data.forEach((img) => {
      (byBook[img.book_id] = byBook[img.book_id] || []).push(img);
    });
    return books.map((b) => ({ ...b, images: byBook[b.id] || [] }));
  } catch {
    return books;
  }
}

export async function getBooks({ category, q } = {}) {
  const sb = supabase;
  if (!sb) return [...SAMPLE_BOOKS].map(normalizeBook);

  let query = sb
    .from('books')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (category && category !== 'all') query = query.eq('category', category);
  if (q && q.trim()) query = query.ilike('title_ar', `%${q.trim()}%`);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return attachImages((data || []).map(normalizeBook));
}

export async function getBook(id) {
  const sb = supabase;
  if (!sb) return SAMPLE_BOOKS.find((b) => b.id === id) ? normalizeBook(SAMPLE_BOOKS.find((b) => b.id === id)) : null;

  const { data, error } = await sb.from('books').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const [withImages] = await attachImages([normalizeBook(data)]);
  return withImages;
}

export async function getCategories() {
  const sb = supabase;
  if (!sb) {
    const counts = {};
    SAMPLE_BOOKS.forEach((b) => (counts[b.category] = (counts[b.category] || 0) + 1));
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }
  try {
    const { data, error } = await sb
      .from('categories')
      .select('name_ar')
      .order('sort', { ascending: true });
    if (error || !data) return [];
    return data.map((c) => ({ name: c.name_ar, count: 0 }));
  } catch {
    return [];
  }
}

export async function getRelatedBooks(book, limit = 4) {
  const sb = supabase;
  const all = await getBooks({ category: book.category });
  const rest = all.filter((b) => b.id !== book.id);
  return sb ? rest.slice(0, limit) : rest.slice(0, limit);
}

// ---------- Orders (cash on delivery) ----------
export async function createOrder({ name, phone, address, city, notes, items }) {
  const total = items.reduce((s, it) => s + Number(it.price) * it.qty, 0);

  if (!supabase) {
    // Demo mode — simulate success so the flow can be tested locally.
    return { id: `local-${Date.now()}`, total, demo: true };
  }

  // NOTE: the id is generated client-side. Guests have INSERT but no
  // SELECT on orders (RLS), so `.select()` after insert would fail —
  // and that keeps order data private.
  const orderId = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `order-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const { error: orderErr } = await supabase
    .from('orders')
    .insert({ id: orderId, customer_name: name, phone, address, city, notes, total });
  if (orderErr) throw new Error(orderErr.message);

  const rows = items.map((it) => ({
    order_id: orderId,
    book_id: it.id,
    title_ar: it.title,
    price: it.price,
    quantity: it.qty,
  }));
  const { error: itemsErr } = await supabase.from('order_items').insert(rows);
  if (itemsErr) throw new Error(itemsErr.message);

  // Decrement stock for each ordered item (SECURITY DEFINER RPC allows anon).
  try {
    for (const it of items) {
      await supabase.rpc('decrement_stock', { p_book_id: it.id, p_qty: it.qty });
    }
  } catch {
    // Best-effort: stock mismatch can be corrected manually in admin.
    console.warn('decrement_stock failed for order', orderId);
  }

  return { id: orderId, total };
}