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
  return (data || []).map(normalizeBook);
}

export async function getBook(id) {
  const sb = supabase;
  if (!sb) return SAMPLE_BOOKS.find((b) => b.id === id) ? normalizeBook(SAMPLE_BOOKS.find((b) => b.id === id)) : null;

  const { data, error } = await sb.from('books').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? normalizeBook(data) : null;
}

export async function getCategories() {
  const sb = supabase;
  if (!sb) {
    const counts = {};
    SAMPLE_BOOKS.forEach((b) => (counts[b.category] = (counts[b.category] || 0) + 1));
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }
  const { data, error } = await sb.from('books').select('category, price').eq('is_active', true);
  if (error) return [];
  const counts = {};
  data.forEach((b) => {
    if (b.category) counts[b.category] = (counts[b.category] || 0) + 1;
  });
  return Object.entries(counts).map(([name, count]) => ({ name, count }));
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

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({ customer_name: name, phone, address, city, notes, total })
    .select('id')
    .single();
  if (orderErr) throw new Error(orderErr.message);

  const rows = items.map((it) => ({
    order_id: order.id,
    book_id: it.id,
    title_ar: it.title,
    price: it.price,
    quantity: it.qty,
  }));
  const { error: itemsErr } = await supabase.from('order_items').insert(rows);
  if (itemsErr) throw new Error(itemsErr.message);

  return { id: order.id, total };
}