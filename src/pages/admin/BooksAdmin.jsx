import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminDeleteBook, adminGetBooks, adminUpdateBook } from '../../lib/admin';
import { formatPrice } from '../../lib/format';
import { useToast } from '../../components/Toast';
import { IconCart, IconClose, IconEdit } from '../../components/icons';

export default function BooksAdmin() {
  const [books, setBooks] = useState(null);
  const [query, setQuery] = useState('');
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

  const filtered = useMemo(() => {
    if (!books) return [];
    const q = query.trim().toLowerCase();
    if (!q) return books;
    return books.filter((b) =>
      [b.title_ar, b.author_ar, b.category, b.publisher_ar]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q))
    );
  }, [books, query]);

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

  const remove = async (b) => {
    if (!window.confirm(`حذف كتاب «${b.title_ar}» نهائياً؟`)) return;
    setBusy(b.id);
    try {
      await adminDeleteBook(b.id);
      show('تم حذف الكتاب');
      load();
    } catch (e) {
      show(e.message, 'error');
    } finally {
      setBusy('');
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">الكتب 📚</h1>
          <p className="mt-1 text-sm text-soft">{books ? `${books.length} كتاب في المكتبة` : 'جارٍ التحميل…'}</p>
        </div>
        <Link to="/admin/books/new" className="btn-primary">＋ إضافة كتاب</Link>
      </div>

      {error && <div className="mt-4 rounded-md bg-rose-50 px-4 py-3 text-sm text-danger">{error}</div>}

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="ابحث بالعنوان، المؤلف، التصنيف…"
        className="input mt-6 max-w-md"
      />

      <div className="mt-4 overflow-x-auto rounded-card border border-line/70 bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-line bg-gray-50 text-start text-xs text-soft">
              <th className="px-4 py-3 text-start font-semibold">الكتاب</th>
              <th className="px-4 py-3 text-start font-semibold">التصنيف</th>
              <th className="px-4 py-3 text-start font-semibold">السعر</th>
              <th className="px-4 py-3 text-center font-semibold">الحالة</th>
              <th className="px-4 py-3 text-center font-semibold">مميز</th>
              <th className="px-4 py-3 text-center font-semibold">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {!books ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-soft">جارٍ التحميل…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-soft">لا توجد نتائج مطابقة.</td></tr>
            ) : (
              filtered.map((b) => (
                <tr key={b.id} className="border-b border-line/60 last:border-0 hover:bg-gray-50/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className={`relative shrink-0 overflow-hidden rounded border border-line bg-gray-100 ${b.is_out_of_stock ? 'opacity-60' : ''}`}>
                        <img src={b.cover_image} alt="" className="h-14 w-11 object-cover" />
                        {b.is_out_of_stock && (
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
                    <div className="flex items-center justify-center gap-1">
                      <Link to={`/admin/books/${b.id}/edit`} className="rounded-md p-2 text-gray-400 transition hover:bg-gray-100 hover:text-brand" title="تعديل" aria-label="تعديل">
                        <IconEdit width={16} height={16} />
                      </Link>
                      <button onClick={() => remove(b)} disabled={busy === b.id} className="rounded-md p-2 text-gray-400 transition hover:bg-rose-50 hover:text-danger" title="حذف" aria-label="حذف">
                        <IconClose width={16} height={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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