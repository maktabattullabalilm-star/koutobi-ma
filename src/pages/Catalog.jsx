import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getBooks, getCategories } from '../lib/api';
import { formatPrice } from '../lib/format';
import ProductCard from '../components/ProductCard';
import { IconChevronDown, IconSearch } from '../components/icons';

const SORTS = [
  { id: 'newest', label: 'الأحدث' },
  { id: 'price_asc', label: 'السعر من الأقل إلى الأعلى' },
  { id: 'price_desc', label: 'السعر من الأعلى إلى الأقل' },
  { id: 'title', label: 'الاسم أبجدياً' },
];

export default function Catalog() {
  const [params, setParams] = useSearchParams();
  const category = params.get('category') || 'all';
  const q = params.get('q') || '';

  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('newest');
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([getBooks({ category, q }), getCategories()])
      .then(([b, c]) => {
        setBooks(b);
        setCategories(c);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [category, q]);

  const sorted = useMemo(() => {
    const list = [...books];
    if (sort === 'price_asc') list.sort((a, b) => a.price - b.price);
    else if (sort === 'price_desc') list.sort((a, b) => b.price - a.price);
    else if (sort === 'title') list.sort((a, b) => (a.title_ar || '').localeCompare(b.title_ar || '', 'ar'));
    else list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return list;
  }, [books, sort]);

  const changeCategory = (c) => {
    const next = new URLSearchParams(params);
    if (c === 'all') next.delete('category');
    else next.set('category', c);
    setParams(next, { replace: true });
  };

  return (
    <div className="container-x py-8">
      {/* header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">
          {category === 'all' ? 'جميع الكتب' : (q ? 'نتائج البحث' : category)}
        </h1>
        <p className="mt-1.5 text-sm text-soft">
          {q ? `نتائج البحث عن: «${q}» — ` : ''}
          {sorted.length} كتاب متاح · الدفع عند الاستلام
        </p>
      </div>

      {/* category chips */}
      <div className="mb-5 flex flex-wrap gap-2">
        <button
          onClick={() => changeCategory('all')}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            category === 'all' ? 'bg-brand text-white' : 'bg-gray-100 text-ink hover:bg-brand-pale'
          }`}
        >
          الكل ({categories.reduce((s, c) => s + c.count, 0) || books.length})
        </button>
        {categories.map((c) => (
          <button
            key={c.name}
            onClick={() => changeCategory(c.name)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              category === c.name ? 'bg-brand text-white' : 'bg-gray-100 text-ink hover:bg-brand-pale'
            }`}
          >
            {c.name} ({c.count})
          </button>
        ))}
      </div>

      {/* toolbar */}
      <div className="mb-6 flex items-center justify-between gap-3">
        {q ? (
          <button
            onClick={() => setParams({}, { replace: true })}
            className="text-sm font-semibold text-brand hover:text-brand-dark"
          >
            ✕ إلغاء البحث
          </button>
        ) : <span className="hidden sm:block" />}
        <label className="relative flex items-center gap-2">
          <span className="text-sm text-soft">ترتيب حسب:</span>
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="appearance-none rounded-md border border-line bg-white py-2 pe-8 ps-3 text-sm font-medium text-ink outline-none focus:border-brand"
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
            <IconChevronDown className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-soft" width={14} height={14} />
          </div>
        </label>
      </div>

      {/* grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card aspect-[4/5] animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-md bg-rose-50 px-4 py-3 text-sm text-danger">{error}</div>
      ) : sorted.length === 0 ? (
        <div className="rounded-card border border-line/70 bg-gray-50 px-6 py-14 text-center">
          <IconSearch className="mx-auto text-gray-300" width={40} height={40} />
          <h3 className="mt-3 text-lg font-bold text-ink">لا توجد كتب مطابقة</h3>
          <p className="mt-1 text-sm text-soft">جرّب تصنيفاً آخر أو تواصل معنا عبر واتساب لطلب كتاب معيّن.</p>
          <a href={`https://wa.me/212600000000?text=${encodeURIComponent('السلام عليكم، أبحث عن كتاب معيّن 📚')}`} target="_blank" rel="noreferrer" className="btn-primary mt-5">
            اطلب الكتاب عبر واتساب
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {sorted.map((b) => (
            <ProductCard key={b.id} book={b} />
          ))}
        </div>
      )}

      {/* sample prices strip */}
      {sorted.length > 0 && (
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2 text-xs text-gray-400">
          <span>الكتب تبدأ من</span>
          <span className="font-bold text-brand">{formatPrice(Math.min(...sorted.map((b) => b.price)))}</span>
        </div>
      )}
    </div>
  );
}