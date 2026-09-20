import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminDeleteBookWithImages, adminGetBooks, adminUpdateBook } from '../../lib/admin';
import { formatPrice } from '../../lib/format';
import { useToast } from '../../components/Toast';
import { IconCart, IconClose, IconEdit, IconMinus, IconPlus } from '../../components/icons';
import BookCover from '../../components/BookCover';
import PageHeader from './PageHeader';

const LOW_STOCK_AT = 5;

export default function BooksAdmin() {
  const { session } = useAuth();
  const [books, setBooks] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | active | hidden
  const [stockFilter, setStockFilter] = useState('all'); // all | in | low | out
  const [catFilter, setCatFilter] = useState('all');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const { show } = useToast();

  const load = () => {
    setError('');
    adminGetBooks()
      .then(setBooks)
      .catch((e) => setError(e.message));
  };
  useEffect(load, []);

  const categories = useMemo(() => {
    const set = new Set();
    (books || []).forEach((b) => b.category && set.add(b.category));
    return [...set].sort();
  }, [books]);

  const filtered = useMemo(() => {
    if (!books) return [];
    const q = query.trim().toLowerCase();
    return books.filter((b) => {
      if (q && ![b.title_ar, b.author_ar, b.category, b.publisher_ar].filter(Boolean).some((v) => v.toLowerCase().includes(q))) return false;
      if (statusFilter === 'active' && !b.is_active) return false;
      if (statusFilter === 'hidden' && b.is_active) return false;
      const stock = b.stock_qty ?? 0;
      if (stockFilter === 'in' && (stock <= 0 || b.is_out_of_stock)) return false;
      if (stockFilter === 'low' && (stock === 0 || stock > LOW_STOCK_AT)) return false;
      if (stockFilter === 'out' && stock > 0 && !b.is_out_of_stock) return false;
      if (catFilter !== 'all' && b.category !== catFilter) return false;
      return true;
    });
  }, [books, query, statusFilter, stockFilter, catFilter]);

  const toggleActive = async (b) => {
    setBusy(b.id);
    try {
      await adminUpdateBook(b.id, { is_active: !b.is_active });
      show(b.is_active ? 'تم إخفاء الكتاب من المتجر' : 'تم نشر الكتاب في المتجر');
      load();
    } catch (e) {
      show(e.message, 'error');
    } finally {
      setBusy('');
    }
  };

  const adjustStock = async (b, delta) => {
    const newQty = Math.max(0, (b.stock_qty || 0) + delta);
    setBusy(b.id);
    try {
      await adminUpdateBook(b.id, { stock_qty: newQty, is_out_of_stock: newQty === 0 });
      show(`تم تحديث المخزون إلى ${newQty}`);
      load();
    } catch (e) {
      show(e.message, 'error');
    } finally {
      setBusy('');
    }
  };

  const remove = async (b) => {
    if (!window.confirm(`حذف كتاب «${b.title_ar}» نهائياً مع صوره من التخزين؟`)) return;
    setBusy(b.id);
    try {
      await adminDeleteBookWithImages(b.id, session?.access_token);
      show('تم حذف الكتاب وصوره');
      load();
    } catch (e) {
      show(e.message, 'error');
    } finally {
      setBusy('');
    }
  };

  const soldOut = (b) => b.is_out_of_stock || (b.stock_qty ?? 0) <= 0;
  const lowStock = (b) => !soldOut(b) && (b.stock_qty ?? 0) <= LOW_STOCK_AT;

  const stockBadge = (b) => {
    if (soldOut(b)) {
      return <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-700">نفد</span>;
    }
    if (lowStock(b)) {
      return <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">بقي {b.stock_qty}</span>;
    }
    return <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">{b.stock_qty} متوفر</span>;
  };

  const stepper = (b) => (
    <div className="flex items-center gap-1" dir="ltr">
      <button
        onClick={() => adjustStock(b, -1)}
        disabled={busy === b.id || (b.stock_qty || 0) <= 0}
        className="rounded p-1.5 text-gray-400 transition hover:bg-rose-50 hover:text-danger disabled:opacity-30"
        title="نقص"
        aria-label="نقص المخزون"
      >
        <IconMinus width={14} height={14} />
      </button>
      <span className={`min-w-7 text-center font-bold ${(b.stock_qty ?? 0) <= LOW_STOCK_AT ? 'text-danger' : 'text-brand'}`}>
        {b.stock_qty ?? 0}
      </span>
      <button
        onClick={() => adjustStock(b, 1)}
        disabled={busy === b.id}
        className="rounded p-1.5 text-gray-400 transition hover:bg-brand-light hover:text-brand disabled:opacity-30"
        title="زيادة"
        aria-label="زيادة المخزون"
      >
        <IconPlus width={14} height={14} />
      </button>
    </div>
  );

  const rowActions = (b) => (
    <div className="flex items-center gap-1">
      <Link to={`/admin/books/${b.id}/edit`} className="rounded-md p-2 text-gray-400 transition hover:bg-gray-100 hover:text-brand" title="تعديل" aria-label="تعديل">
        <IconEdit width={16} height={16} />
      </Link>
      <button onClick={() => remove(b)} disabled={busy === b.id} className="rounded-md p-2 text-gray-400 transition hover:bg-rose-50 hover:text-danger" title="حذف" aria-label="حذف">
        <IconClose width={16} height={16} />
      </button>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="الكتب 📚"
        description={books ? `${books.length} كتاب في المكتبة` : 'جارٍ التحميل…'}
        crumbs={[{ label: 'لوحة التحكم', to: '/admin/dashboard' }, { label: 'الكتب' }]}
        actions={<Link to="/admin/books/new" className="btn-primary">＋ إضافة كتاب</Link>}
      />

      {error && <div className="mb-4 rounded-md bg-rose-50 px-4 py-3 text-sm text-danger">{error}</div>}

      {/* search + filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث بالعنوان، المؤلف، التصنيف…"
          className="input sm:max-w-xs"
          aria-label="بحث"
        />
        <div className="flex flex-wrap gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input !w-auto" aria-label="حالة النشر">
            <option value="all">كل الحالات</option>
            <option value="active">منشور</option>
            <option value="hidden">مخفي</option>
          </select>
          <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} className="input !w-auto" aria-label="المخزون">
            <option value="all">كل المخزون</option>
            <option value="in">متوفر</option>
            <option value="low">قارب النفاد</option>
            <option value="out">نافد</option>
          </select>
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="input !w-auto" aria-label="التصنيف">
            <option value="all">كل التصنيفات</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      {books && (
        <p className="mt-2 text-xs text-soft">{filtered.length} من {books.length} — مطابقة للبحث والفلاتر</p>
      )}

      {/* desktop table */}
      <div className="mt-4 hidden overflow-x-auto rounded-card border border-line/70 bg-white md:block">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-line bg-gray-50 text-start text-xs text-soft">
              <th className="px-4 py-3 text-start font-semibold">الكتاب</th>
              <th className="px-4 py-3 text-start font-semibold">التصنيف</th>
              <th className="px-4 py-3 text-start font-semibold">السعر</th>
              <th className="px-4 py-3 text-center font-semibold">المخزون</th>
              <th className="px-4 py-3 text-center font-semibold">الحالة</th>
              <th className="px-4 py-3 text-center font-semibold">مميز</th>
              <th className="px-4 py-3 text-center font-semibold">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {!books ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-soft">جارٍ التحميل…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-soft">لا توجد نتائج مطابقة.</td></tr>
            ) : (
              filtered.map((b) => (
                <tr key={b.id} className="border-b border-line/60 last:border-0 hover:bg-gray-50/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className={`relative shrink-0 overflow-hidden rounded border border-line bg-gray-100 ${soldOut(b) ? 'opacity-60' : ''}`}>
                        <BookCover src={b.cover_image} alt="" className="h-14 w-11" imgClassName="h-full w-full object-cover" />
                        {soldOut(b) && (
                          <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-[9px] font-bold text-white">نفد</span>
                        )}
                      </span>
                      <div className="min-w-0">
                        <div className="clamp-2 max-w-56 font-semibold text-ink">{b.title_ar}</div>
                        <div className="text-xs text-soft">{b.author_ar || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-soft">{b.category || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-brand">{formatPrice(b.price)}</span>
                    {b.old_price != null && b.old_price > b.price && (
                      <span className="ms-1.5 text-xs text-soft line-through">{formatPrice(b.old_price)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      {stepper(b)}
                      {stockBadge(b)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleActive(b)}
                      disabled={busy === b.id}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                        b.is_active ? 'bg-brand-light text-brand hover:bg-brand/20' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                      title={b.is_active ? 'الكتاب ظاهر في المتجر — اضغط للإخفاء' : 'الكتاب مخفي — اضغط للنشر'}
                    >
                      {b.is_active ? 'منشور' : 'مخفي'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {b.is_featured ? (
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">⭐ مميز</span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center">{rowActions(b)}</div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* mobile cards */}
      <div className="mt-4 space-y-3 md:hidden">
        {!books ? (
          <div className="card border border-line/60 p-10 text-center text-sm text-soft">جارٍ التحميل…</div>
        ) : filtered.length === 0 ? (
          <div className="card border border-line/60 p-10 text-center text-sm text-soft">لا توجد نتائج مطابقة.</div>
        ) : (
          filtered.map((b) => (
            <article key={b.id} className="card border border-line/60 p-3">
              <div className="flex gap-3">
                <span className={`relative shrink-0 overflow-hidden rounded border border-line bg-gray-100 ${soldOut(b) ? 'opacity-60' : ''}`}>
                  <BookCover src={b.cover_image} alt="" className="h-20 w-16" imgClassName="h-full w-full object-cover" />
                  {soldOut(b) && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-[10px] font-bold text-white">نفد</span>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="clamp-2 text-sm font-bold text-ink">{b.title_ar}</div>
                  <div className="mt-0.5 truncate text-xs text-soft">{b.author_ar || '—'} · {b.category || '—'}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-brand">{formatPrice(b.price)}</span>
                    {stockBadge(b)}
                    {!b.is_active && (
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-500">مخفي</span>
                    )}
                    {b.is_featured && (
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">⭐</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-line/60 pt-2">
                {stepper(b)}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleActive(b)}
                    disabled={busy === b.id}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${b.is_active ? 'bg-brand-light text-brand' : 'bg-gray-100 text-gray-500'}`}
                  >
                    {b.is_active ? 'منشور' : 'مخفي'}
                  </button>
                  {rowActions(b)}
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      {books && books.length === 0 && (
        <div className="mt-6 rounded-card border border-dashed border-line px-6 py-12 text-center">
          <IconCart className="mx-auto text-gray-300" width={40} height={40} />
          <h3 className="mt-2 font-bold text-ink">المكتبة فارغة</h3>
          <p className="mt-1 text-sm text-soft">أضف أول كتاب الآن.</p>
          <Link to="/admin/books/new" className="btn-primary mt-4">＋ إضافة كتاب</Link>
        </div>
      )}
    </div>
  );
}
