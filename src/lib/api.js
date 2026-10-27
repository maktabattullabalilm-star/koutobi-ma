import { supabase } from './supabase';
import { normalizeBook } from './format';
import { HIDDEN_EDITION_SPECS_KEY, buildCategoryTree, parseHiddenEditionSpecs } from './catalog';

const NOT_CONFIGURED = 'تعذّر الاتصال بقاعدة البيانات — تحقّق من الإنترنت ثم أعد تحميل الصفحة';

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

export async function getBooks({ category, categories, q } = {}) {
  const sb = supabase;
  if (!sb) throw new Error(NOT_CONFIGURED);

  let query = sb.from('books').select('*').eq('is_active', true).order('created_at', { ascending: false });

  const scope = Array.isArray(categories) ? categories.filter(Boolean) : [];
  if (scope.length) query = query.in('category', scope);
  else if (category && category !== 'all') query = query.eq('category', category);
  if (q && q.trim()) {
    const needle = q.trim().replace(/[%_,]/g, '');
    query = query.or(`title_ar.ilike.%${needle}%,author_ar.ilike.%${needle}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return attachImages((data || []).map(normalizeBook));
}

function normalizeBundle(row) {
  const books = row.bundle_offer_books || [];
  const stockQty = books.length ? Math.min(...books.map((item) => Number(item.books?.stock_qty || 0))) : 0;
  return {
    ...row,
    product_type: 'bundle',
    title_ar: row.name_ar,
    price: Number(row.bundle_price),
    old_price: Number(row.component_total || 0) || null,
    stock_qty: stockQty,
    is_out_of_stock: stockQty < 1,
    cover_image: row.cover_image || books[0]?.books?.cover_image || null,
    books,
  };
}

export async function getBundles() {
  const sb = supabase;
  if (!sb) return [];
  const now = new Date().toISOString();
  const { data, error } = await sb
    .from('bundle_offers')
    .select(
      '*, bundle_offer_books(book_id, books(title_ar, author_ar, cover_image, stock_qty, price, category))'
    )
    .eq('is_active', true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gt.${now}`)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((row) =>
    normalizeBundle({
      ...row,
      component_total: row.bundle_offer_books?.reduce((sum, item) => sum + Number(item.books?.price || 0), 0),
    })
  );
}

export async function getBundle(id) {
  const bundles = await getBundles();
  return bundles.find((bundle) => bundle.id === id) || null;
}

export async function getBook(id) {
  const sb = supabase;
  if (!sb) throw new Error(NOT_CONFIGURED);

  const { data, error } = await sb.from('books').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const [withImages] = await attachImages([normalizeBook(data)]);
  return withImages;
}

export async function getCategories() {
  const sb = supabase;
  if (!sb) return [];
  try {
    const [{ data: cats, error: catsErr }, { data: books, error: booksErr }] = await Promise.all([
      sb.from('categories').select('id, name_ar, slug, parent_id, sort').order('sort', { ascending: true }),
      sb.from('books').select('category').eq('is_active', true),
    ]);
    if (catsErr || !cats) return [];
    const counts = {};
    if (!booksErr && books) {
      books.forEach((b) => {
        if (b.category) counts[b.category] = (counts[b.category] || 0) + 1;
      });
    }
    // Flat display order (depth-first) with direct and subtree counts.
    const decorate = (nodes, depth) =>
      nodes.flatMap((node) => {
        const children = decorate(node.children || [], depth + 1);
        const count = counts[node.name_ar] || 0;
        const totalCount = count + children.reduce((sum, child) => sum + child.totalCount, 0);
        return [
          {
            id: node.id,
            name: node.name_ar,
            parentId: node.parent_id ?? null,
            depth,
            childCount: (node.children || []).length,
            count,
            totalCount,
          },
          ...children,
        ];
      });
    return decorate(buildCategoryTree(cats), 0);
  } catch {
    return [];
  }
}

/** Public read of the edition specs hidden from the book page. Fails open. */
export async function getHiddenEditionSpecs() {
  const sb = supabase;
  if (!sb) return [];
  try {
    const { data, error } = await sb
      .from('app_settings')
      .select('value')
      .eq('key', HIDDEN_EDITION_SPECS_KEY)
      .maybeSingle();
    if (error) return [];
    return parseHiddenEditionSpecs(data?.value);
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
// and inserts order + items + stock decrement atomically (backlog 08).
const ORDER_RPC_ERRORS = [
  [/rate limited/i, 'لقد تجاوزت عدد المحاولات — حاول مجددًا بعد ساعة'],
  [/bad phone/i, 'أدخل رقم هاتف مغربي صحيح (مثال: 0612345678)'],
  [/bad name/i, 'الرجاء إدخال الاسم كاملاً'],
  [/bad address/i, 'أدخل عنواناً تفصيلياً لضمان التوصيل'],
  [/bad city/i, 'أدخل اسم مدينة صحيح'],
  [/bad notes/i, 'الملاحظات طويلة جدًا'],
  [/bad items|bad qty/i, 'محتوى السلة غير صالح — حدّث الصفحة وحاول مجددًا'],
  [/book not found|book inactive/i, 'أحد الكتب لم يعد متوفرًا — حدّث السلة وحاول مجددًا'],
  [/bundle unavailable/i, 'هذه الباقة لم تعد متوفرة — حدّث السلة وحاول مجددًا'],
  [/out of stock: (.*)/i, 'نفدت كمية «$1» — أزلها من السلة وأعد المحاولة'],
  [/over stock: (.*) asked (\d+) have (\d+)/i, 'الكمية المتوفرة من «$1» هي $3 فقط — عدّل السلة وحاول مجددًا'],
  [/invalid coupon/i, 'رمز الخصم غير صالح أو منتهٍ'],
  [/coupon exhausted/i, 'تم استهلاك جميع استخدامات هذا الكوبون'],
  [/coupon phone limit/i, 'استُخدم هذا الكوبون مسبقاً مع رقم الهاتف نفسه'],
  [/coupon minimum/i, 'لم يصل الطلب إلى الحد الأدنى لاستخدام الكوبون'],
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

export async function createOrder({ name, phone, address, city, notes, items, couponCode = '' }) {
  if (!supabase) throw new Error(NOT_CONFIGURED);

  const p_items = items.map((it) =>
    it.product_type === 'bundle' ? { bundle_id: it.id, qty: it.qty } : { book_id: it.id, qty: it.qty }
  );
  const { data, error } = await supabase.rpc('create_order_with_offers', {
    p_name: name,
    p_phone: phone,
    p_address: address,
    p_city: city || null,
    p_notes: notes || null,
    p_items,
    p_coupon_code: couponCode.trim().toUpperCase() || null,
  });
  if (error) throw new Error(mapOrderError(error.message));
  return {
    id: data.id,
    total: Number(data.total),
    adjusted: [],
    discountTotal: Number(data.discount_total || 0),
    bundleDiscountTotal: Number(data.bundle_discount_total || 0),
  };
}
