import { supabase, SUPABASE_ENABLED } from './supabase';
import { SAMPLE_BOOKS } from './sampleData';
import { normalizeBook } from './format';

export const DEMO_MODE = !SUPABASE_ENABLED;

// ---------- Catalog (customer side) ----------

/** Attach ordered gallery rows to books. Fails open: covers keep working. */
async function attachImages(books) {
  const sb = supabase;
  if (!sb || !books.length) return books;
  try {
    const { data, error } = await sb
      .from('book_images')
      .select('*')
      .in(
        'book_id',
        books.map((b) => b.id)
      )
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

  let query = sb.from('books').select('*').eq('is_active', true).order('created_at', { ascending: false });

  if (category && category !== 'all') query = query.eq('category', category);
  if (q && q.trim()) {
    const needle = q.trim().replace(/[%_,]/g, '');
    query = query.or(`title_ar.ilike.%${needle}%,author_ar.ilike.%${needle}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return attachImages((data || []).map(normalizeBook));
}

export async function getBook(id) {
  const sb = supabase;
  if (!sb)
    return SAMPLE_BOOKS.find((b) => b.id === id)
      ? normalizeBook(SAMPLE_BOOKS.find((b) => b.id === id))
      : null;

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
    const [{ data: cats, error: catsErr }, { data: books, error: booksErr }] = await Promise.all([
      sb.from('categories').select('name_ar').order('sort', { ascending: true }),
      sb.from('books').select('category').eq('is_active', true),
    ]);
    if (catsErr || !cats) return [];
    const counts = {};
    if (!booksErr && books) {
      books.forEach((b) => {
        if (b.category) counts[b.category] = (counts[b.category] || 0) + 1;
      });
    }
    return cats.map((c) => ({ name: c.name_ar, count: counts[c.name_ar] || 0 }));
  } catch {
    return [];
  }
}

export async function getRelatedBooks(book, limit = 4) {
  const all = await getBooks({ category: book.category });
  return all.filter((b) => b.id !== book.id).slice(0, limit);
}

/** Public storefront read of the quantity-visibility default. Fails open. */
export async function getShowQtyDefault() {
  const sb = supabase;
  if (!sb) return 'hide';
  try {
    const { data, error } = await sb
      .from('app_settings')
      .select('value')
      .eq('key', 'show_quantity_default')
      .maybeSingle();
    if (error) return 'hide';
    return data?.value === 'show' ? 'show' : 'hide';
  } catch {
    return 'hide';
  }
}

// ---------- Orders (cash on delivery) ----------
// Prices are NEVER trusted from the browser: only id+qty are sent,
// the server re-reads books.price, validates stock, computes total,
// and inserts order + items + stock decrement atomically (docs/backlog/08).
const ORDER_RPC_ERRORS = [
  [/rate limited/i, 'لقد تجاوزت عدد المحاولات — حاول مجددًا بعد ساعة'],
  [/bad phone/i, 'أدخل رقم هاتف مغربي صحيح (مثال: 0612345678)'],
  [/bad name/i, 'الرجاء إدخال الاسم كاملاً'],
  [/bad address/i, 'أدخل عنواناً تفصيلياً لضمان التوصيل'],
  [/bad city/i, 'أدخل اسم مدينة صحيح'],
  [/bad notes/i, 'الملاحظات طويلة جدًا'],
  [/bad items|bad qty/i, 'محتوى السلة غير صالح — حدّث الصفحة وحاول مجددًا'],
  [/book not found|book inactive/i, 'أحد الكتب لم يعد متوفرًا — حدّث السلة وحاول مجددًا'],
  [/out of stock: (.*)/i, 'نفدت كمية «$1» — أزلها من السلة وأعد المحاولة'],
  [/over stock: (.*) asked (\d+) have (\d+)/i, 'الكمية المتوفرة من «$1» هي $3 فقط — عدّل السلة وحاول مجددًا'],
];

function mapOrderError(message) {
  const msg = String(message || '');
  for (const [re, ar] of ORDER_RPC_ERRORS) {
    const m = msg.match(re);
    if (m) {
      let out = ar;
      m.slice(1).forEach((g, i) => {
        out = out.replace(`$${i + 1}`, g);
      });
      return out;
    }
  }
  return 'تعذّر إرسال الطلب — حاول مجددًا';
}

export async function createOrder({ name, phone, address, city, notes, items }) {
  if (!supabase) {
    // Demo mode — simulate success so the flow can be tested locally.
    const total = items.reduce((s, it) => s + Number(it.price) * it.qty, 0);
    return { id: `local-${Date.now()}`, total, demo: true };
  }

  const p_items = items.map((it) => ({ book_id: it.id, qty: it.qty }));
  const { data, error } = await supabase.rpc('create_order', {
    p_name: name,
    p_phone: phone,
    p_address: address,
    p_city: city || null,
    p_notes: notes || null,
    p_items,
  });
  if (error) throw new Error(mapOrderError(error.message));
  return { id: data.id, total: Number(data.total), adjusted: [] };
}
