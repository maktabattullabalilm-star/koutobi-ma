import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminDeleteBookWithImages, adminGetBooks, adminUpdateBook } from '../../lib/admin';
import { formatPrice } from '../../lib/format';
import { useToast } from '../../components/Toast';
import { IconCart, IconClose, IconEdit, IconMinus, IconPlus, IconStar } from '../../components/icons';
import BookCover from '../../components/BookCover';
import PageHeader from './PageHeader';
import StatusPill from './StatusPill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

const LOW_STOCK_AT = 5;

const STATUS_OPTS = [
  { id: 'all', label: 'الكل' },
  { id: 'active', label: 'منشور' },
  { id: 'hidden', label: 'مخفي' },
];
const STOCK_OPTS = [
  { id: 'all', label: 'الكل' },
  { id: 'in', label: 'متوفر' },
  { id: 'low', label: 'قارب النفاد' },
  { id: 'out', label: 'نافد' },
];

function Segmented({ options, value, onChange, label }) {
  return (
    <div className="flex flex-wrap items-center gap-1" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={`rounded-full px-3.5 py-2 text-xs font-bold transition ${
            value === o.id ? 'bg-brand text-white' : 'bg-white text-soft ring-1 ring-inset ring-line hover:text-brand hover:ring-brand/40'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function BooksAdmin() {
  const { session } = useAuth();
  const [books, setBooks] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('all');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
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

  const isFiltered = query.trim() || statusFilter !== 'all' || stockFilter !== 'all' || catFilter !== 'all';
  const clearFilters = () => {
    setQuery('');
    setStatusFilter('all');
    setStockFilter('all');
    setCatFilter('all');
  };

  /** Optimistic local patch — no full reload, no scroll loss. Reverts on error. */
  const patchLocal = (id, patch) =>
    setBooks((prev) => (prev || []).map((b) => (b.id === id ? { ...b, ...patch } : b)));

  const toggleActive = async (b) => {
    const next = !b.is_active;
    patchLocal(b.id, { is_active: next });
    try {
      await adminUpdateBook(b.id, { is_active: next });
      show(next ? 'تم نشر الكتاب في المتجر' : 'تم إخفاء الكتاب من المتجر');
    } catch (e) {
      patchLocal(b.id, { is_active: b.is_active });
      show(e.message, 'error');
    }
  };

  const toggleFeatured = async (b) => {
    const next = !b.is_featured;
    patchLocal(b.id, { is_featured: next });
    try {
      await adminUpdateBook(b.id, { is_featured: next });
      show(next ? 'أصبح الكتاب مميزاً ⭐' : 'أُلغي تمييز الكتاب');
    } catch (e) {
      patchLocal(b.id, { is_featured: b.is_featured });
      show(e.message, 'error');
    }
  };

  const adjustStock = async (b, delta) => {
    const newQty = Math.max(0, (b.stock_qty || 0) + delta);
    const prev = { stock_qty: b.stock_qty, is_out_of_stock: b.is_out_of_stock };
    patchLocal(b.id, { stock_qty: newQty, is_out_of_stock: newQty === 0 });
    setBusy(b.id);
    try {
      await adminUpdateBook(b.id, { stock_qty: newQty, is_out_of_stock: newQty === 0 });
    } catch (e) {
      patchLocal(b.id, prev);
      show(e.message, 'error');
    } finally {
      setBusy('');
    }
  };

  const confirmRemove = async () => {
    const b = pendingDelete;
    if (!b) return;
    setPendingDelete(null);
    setBusy(b.id);
    try {
      await adminDeleteBookWithImages(b.id, session?.access_token);
      setBooks((prev) => (prev || []).filter((x) => x.id !== b.id));
      show('تم حذف الكتاب وصوره');
    } catch (e) {
      show(e.message, 'error');
    } finally {
      setBusy('');
    }
  };

  const soldOut = (b) => b.is_out_of_stock || (b.stock_qty ?? 0) <= 0;
  const lowStock = (b) => !soldOut(b) && (b.stock_qty ?? 0) <= LOW_STOCK_AT;

  const stockCell = (b, compact = false) => (
    <div className={`flex items-center gap-1 ${compact ? '' : 'justify-center'}`} dir="ltr">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => adjustStock(b, -1)}
        disabled={busy === b.id || (b.stock_qty || 0) <= 0}
        className="text-gray-400 hover:bg-rose-50 hover:text-danger"
        title="نقص"
        aria-label="نقص المخزون"
      >
        <IconMinus width={14} height={14} />
      </Button>
      <span className={`w-8 text-center text-sm font-bold tabular-nums ${(b.stock_qty ?? 0) <= 0 ? 'text-danger' : lowStock(b) ? 'text-amber-600' : 'text-brand'}`}>
        {b.stock_qty ?? 0}
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => adjustStock(b, 1)}
        disabled={busy === b.id}
        className="text-gray-400 hover:bg-brand-light hover:text-brand"
        title="زيادة"
        aria-label="زيادة المخزون"
      >
        <IconPlus width={14} height={14} />
      </Button>
    </div>
  );

  const publishToggle = (b) => (
    <button
      onClick={() => toggleActive(b)}
      className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition ${
        b.is_active ? 'bg-brand-light text-brand hover:bg-brand/20' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
      }`}
      title={b.is_active ? 'الكتاب ظاهر في المتجر — اضغط للإخفاء' : 'الكتاب مخفي — اضغط للنشر'}
    >
      {b.is_active ? 'منشور' : 'مخفي'}
    </button>
  );

  const rowActions = (b) => (
    <div className="flex items-center gap-0.5">
      <button
        onClick={() => toggleFeatured(b)}
        className={`rounded-md p-2 transition ${b.is_featured ? 'text-amber-500 hover:bg-amber-50' : 'text-gray-300 hover:bg-amber-50 hover:text-amber-500'}`}
        title={b.is_featured ? 'إلغاء التمييز' : 'تمييز الكتاب'}
        aria-label="تمييز"
      >
        <IconStar filled={b.is_featured} width={16} height={16} />
      </button>
      <Link to={`/admin/books/${b.id}/edit`} className="rounded-md p-2 text-gray-400 transition hover:bg-gray-100 hover:text-brand" title="تعديل" aria-label="تعديل">
        <IconEdit width={16} height={16} />
      </Link>
      <button onClick={() => setPendingDelete(b)} disabled={busy === b.id} className="rounded-md p-2 text-gray-400 transition hover:bg-rose-50 hover:text-danger" title="حذف" aria-label="حذف">
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
        actions={
          <Button asChild>
            <Link to="/admin/books/new">＋ إضافة كتاب</Link>
          </Button>
        }
      />

      {error && <div className="mb-4 rounded-md bg-rose-50 px-4 py-3 text-sm text-danger">{error}</div>}

      {/* sticky filter bar */}
      <div className="sticky top-0 z-10 -mx-1 bg-gray-50/95 px-1 py-2 backdrop-blur">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث بالعنوان، المؤلف، التصنيف…"
          aria-label="بحث"
        />
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Segmented options={STATUS_OPTS} value={statusFilter} onChange={setStatusFilter} label="حالة النشر" />
          <Segmented options={STOCK_OPTS} value={stockFilter} onChange={setStockFilter} label="المخزون" />
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="w-auto !py-2 text-xs" aria-label="التصنيف">
              <SelectValue placeholder="كل التصنيفات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل التصنيفات</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-1 flex items-center justify-between">
        <p className="text-xs text-soft">
          {books ? (isFiltered ? `${filtered.length} من ${books.length}` : `${books.length} كتاب`) : '…'}
        </p>
        {isFiltered && (
          <Button variant="link" onClick={clearFilters} className="h-auto p-0 text-xs font-bold text-danger">
            ✕ مسح الفلاتر
          </Button>
        )}
      </div>

      {/* desktop table */}
      <div className="mt-3 hidden overflow-x-auto rounded-card border border-line/70 bg-white md:block">
        <Table className="min-w-[720px]">
          <TableHeader className="sticky top-0">
            <TableRow className="border-b border-line bg-gray-50 text-xs text-soft hover:bg-gray-50">
              <TableHead className="px-4 py-3 text-start font-semibold">الكتاب</TableHead>
              <TableHead className="px-4 py-3 text-start font-semibold">التصنيف</TableHead>
              <TableHead className="px-4 py-3 text-start font-semibold">السعر</TableHead>
              <TableHead className="px-4 py-3 text-center font-semibold">المخزون</TableHead>
              <TableHead className="px-4 py-3 text-center font-semibold">الحالة</TableHead>
              <TableHead className="px-4 py-3 text-center font-semibold">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!books ? (
              <TableRow>
                <TableCell colSpan={6} className="space-y-2 px-4 py-4">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="px-4 py-12 text-center">
                  <p className="text-sm text-soft">لا توجد نتائج مطابقة.</p>
                  {isFiltered && (
                    <Button variant="outline" size="sm" onClick={clearFilters} className="mt-3">مسح الفلاتر</Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((b) => (
                <TableRow key={b.id} className="border-b border-line/60 last:border-0 hover:bg-gray-50/60">
                  <TableCell className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className={`relative shrink-0 overflow-hidden rounded border border-line bg-gray-100 ${soldOut(b) ? 'opacity-60' : ''}`}>
                        <BookCover src={b.cover_image} alt="" className="h-12 w-9" imgClassName="h-full w-full object-cover" />
                        {soldOut(b) && (
                          <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-[9px] font-bold text-white">نفد</span>
                        )}
                      </span>
                      <div className="min-w-0">
                        <div className="clamp-2 max-w-56 font-semibold text-ink">
                          {b.is_featured && <span className="me-1 text-amber-500">★</span>}{b.title_ar}
                        </div>
                        <div className="text-xs text-soft">{b.author_ar || '—'}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-4 py-2.5 text-soft">{b.category || '—'}</TableCell>
                  <TableCell className="whitespace-nowrap px-4 py-2.5">
                    <span className="font-bold tabular-nums text-brand">{formatPrice(b.price)}</span>
                    {b.old_price != null && b.old_price > b.price && (
                      <span className="ms-1.5 text-xs tabular-nums text-soft line-through">{formatPrice(b.old_price)}</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-2.5">
                    <div className="flex items-center justify-center gap-2">
                      {stockCell(b)}
                      {soldOut(b) ? (
                        <StatusPill tone="red">نفد</StatusPill>
                      ) : lowStock(b) ? (
                        <StatusPill tone="amber">قارب</StatusPill>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-2.5 text-center">{publishToggle(b)}</TableCell>
                  <TableCell className="px-4 py-2.5">
                    <div className="flex items-center justify-center">{rowActions(b)}</div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* mobile cards */}
      <div className="mt-3 space-y-3 md:hidden">
        {!books ? (
          <>
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </>
        ) : filtered.length === 0 ? (
          <div className="card border border-line/60 p-10 text-center">
            <p className="text-sm text-soft">لا توجد نتائج مطابقة.</p>
            {isFiltered && (
              <Button variant="outline" size="sm" onClick={clearFilters} className="mt-3">مسح الفلاتر</Button>
            )}
          </div>
        ) : (
          filtered.map((b) => (
            <article key={b.id} className="card border border-line/60 p-4">
              <div className="flex gap-3">
                <span className={`relative shrink-0 overflow-hidden rounded border border-line bg-gray-100 ${soldOut(b) ? 'opacity-60' : ''}`}>
                  <BookCover src={b.cover_image} alt="" className="h-16 w-12" imgClassName="h-full w-full object-cover" />
                  {soldOut(b) && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-[10px] font-bold text-white">نفد</span>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="clamp-2 text-[15px] font-bold leading-6 text-ink">
                    {b.is_featured && <span className="me-1 text-amber-500">★</span>}{b.title_ar}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-soft">{b.author_ar || '—'} · {b.category || '—'}</div>
                  <div className="mt-1.5 text-base font-bold tabular-nums text-brand">{formatPrice(b.price)}</div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {publishToggle(b)}
                    {soldOut(b) ? (
                      <StatusPill tone="red">نافد</StatusPill>
                    ) : lowStock(b) ? (
                      <StatusPill tone="amber">بقي {b.stock_qty}</StatusPill>
                    ) : (
                      <StatusPill tone="green">متوفر</StatusPill>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-3">
                {stockCell(b, true)}
                {rowActions(b)}
              </div>
            </article>
          ))
        )}
      </div>

      {books && books.length === 0 && (
        <Empty className="mt-6 border border-dashed border-line">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconCart width={20} height={20} />
            </EmptyMedia>
            <EmptyTitle>المكتبة فارغة</EmptyTitle>
            <EmptyDescription>أضف أول كتاب الآن.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link to="/admin/books/new">＋ إضافة كتاب</Link>
            </Button>
          </EmptyContent>
        </Empty>
      )}

      {/* delete confirmation */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الكتاب نهائياً؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيُحذف «{pendingDelete?.title_ar}» مع كل صوره من التخزين. لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove} className="bg-danger text-white hover:bg-danger/90">
              حذف نهائي
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
