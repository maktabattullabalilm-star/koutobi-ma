import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowDownToLine, Boxes, ClipboardList, History, Search, Settings2, TriangleAlert } from 'lucide-react';
import { adminAdjustStock, adminBulkStockIn, adminGetBooks, adminGetStockMovements } from '../../lib/admin';
import { LOW_STOCK_AT } from '../../lib/constants';
import { formatDate, isSoldOut } from '../../lib/format';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/admin/PageHeader';
import StatusPill from '../../components/admin/StatusPill';
import BookCover from '../../components/BookCover';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const FILTERS = [
  { value: 'all', label: 'كل الكتب' },
  { value: 'available', label: 'متوفر' },
  { value: 'low', label: 'قارب النفاد' },
  { value: 'out', label: 'نافد' },
];
const REASONS = {
  restock: 'توريد جديد', correction: 'تصحيح الجرد', damaged: 'تالف أو مفقود',
  customer_return: 'إرجاع عميل', other: 'سبب آخر', opening_balance: 'الرصيد عند بدء السجل',
  order_confirmed: 'تأكيد طلب', order_cancelled: 'إلغاء طلب',
};

function InventoryStatus({ book }) {
  if (isSoldOut(book)) return <StatusPill tone="red">نافد</StatusPill>;
  if (book.stock_qty <= LOW_STOCK_AT) return <StatusPill tone="amber">قارب النفاد</StatusPill>;
  return <StatusPill tone="green">متوفر</StatusPill>;
}

function SummaryCard({ label, value, icon: Icon, tone = 'green' }) {
  const colors = { green: 'bg-brand-light text-brand', amber: 'bg-amber-100 text-amber-700', red: 'bg-rose-100 text-danger', ink: 'bg-gray-100 text-ink' };
  return <Card className="flex items-center gap-3 border-line/70 p-4"><span className={`flex h-10 w-10 items-center justify-center rounded-lg ${colors[tone]}`}><Icon size={20} /></span><div><div className="text-xl font-bold tabular-nums text-ink">{value}</div><div className="text-xs text-soft">{label}</div></div></Card>;
}

function MovementList({ movements, loading, onMore, hasMore }) {
  if (!movements.length && !loading) return <p className="py-6 text-center text-sm text-soft">لا توجد حركات مسجلة لهذا الكتاب بعد.</p>;
  return <div className="space-y-2">{movements.map((movement) => <div key={movement.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-white p-3"><span className={`min-w-16 rounded-md px-2 py-1 text-center text-sm font-bold tabular-nums ${movement.quantity_delta > 0 ? 'bg-emerald-50 text-emerald-700' : movement.quantity_delta < 0 ? 'bg-rose-50 text-danger' : 'bg-gray-100 text-soft'}`} dir="ltr">{movement.quantity_delta > 0 ? '+' : ''}{movement.quantity_delta}</span><div className="min-w-0 flex-1"><div className="text-sm font-semibold text-ink">{REASONS[movement.reason] || movement.reason}</div><div className="text-xs text-soft">{movement.note || (movement.order_id ? <>طلب مرتبط: <bdi dir="ltr">{movement.order_id.slice(0, 8)}</bdi></> : '—')}</div><div className="mt-0.5 text-[11px] text-soft">بواسطة: {movement.profiles?.email ? <bdi dir="ltr">{movement.profiles.email}</bdi> : movement.reason === 'opening_balance' ? 'رصيد افتتاحي' : 'مدير المتجر'}</div></div><div className="text-end text-xs text-soft"><div>{formatDate(movement.created_at)}</div><div>الرصيد بعد الحركة: <b className="tabular-nums text-ink">{movement.balance_after}</b></div></div></div>)}{hasMore && <Button type="button" variant="outline" onClick={onMore} disabled={loading} className="w-full">{loading ? 'جارٍ التحميل…' : 'تحميل حركات أقدم'}</Button>}</div>;
}

export default function StockAdmin() {
  const { show } = useToast();
  const [searchParams] = useSearchParams();
  const focusBookId = searchParams.get('book');
  const [books, setBooks] = useState(null);
  const [latestMovements, setLatestMovements] = useState([]);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkQty, setBulkQty] = useState('');
  const [bulkReason, setBulkReason] = useState('restock');
  const [bulkNote, setBulkNote] = useState('');
  const [adjustBook, setAdjustBook] = useState(null);
  const [adjustMode, setAdjustMode] = useState('add');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('restock');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [historyBook, setHistoryBook] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [historyMore, setHistoryMore] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const [bookRows, movementRows] = await Promise.all([
        adminGetBooks(),
        adminGetStockMovements({ limit: 100 }),
      ]);
      setBooks(bookRows);
      setLatestMovements(movementRows);
    } catch (err) {
      setError(err.message || 'تعذّر تحميل المخزون');
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const focused = books?.find((book) => book.id === focusBookId);
    if (focused) setQuery(focused.title_ar);
  }, [books, focusBookId]);

  const categories = useMemo(() => [...new Set((books || []).map((book) => book.category).filter(Boolean))].sort(), [books]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (books || []).filter((book) => {
      if (q && ![book.title_ar, book.author_ar, book.isbn, book.category].filter(Boolean).some((v) => v.toLowerCase().includes(q))) return false;
      if (category !== 'all' && book.category !== category) return false;
      if (filter === 'available' && isSoldOut(book)) return false;
      if (filter === 'low' && (isSoldOut(book) || book.stock_qty > LOW_STOCK_AT)) return false;
      if (filter === 'out' && !isSoldOut(book)) return false;
      return true;
    });
  }, [books, query, category, filter]);

  const stats = useMemo(() => {
    const rows = books || [];
    return {
      units: rows.reduce((sum, book) => sum + (book.stock_qty || 0), 0),
      available: rows.filter((book) => !isSoldOut(book)).length,
      low: rows.filter((book) => !isSoldOut(book) && book.stock_qty <= LOW_STOCK_AT).length,
      out: rows.filter(isSoldOut).length,
    };
  }, [books]);

  const lastMovement = useMemo(() => {
    const map = new Map();
    latestMovements.forEach((movement) => {
      if (movement.book_id && !map.has(movement.book_id)) map.set(movement.book_id, movement);
    });
    return map;
  }, [latestMovements]);

  const toggleSelected = (id) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const selectVisible = () => {
    const ids = filtered.map((book) => book.id);
    setSelected((current) => ids.every((id) => current.includes(id)) ? current.filter((id) => !ids.includes(id)) : [...new Set([...current, ...ids])]);
  };

  const openAdjust = (book) => {
    setAdjustBook(book);
    setAdjustMode('add');
    setQuantity('');
    setReason('restock');
    setNote('');
  };

  const saveAdjustment = async (event) => {
    event.preventDefault();
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 0 || (adjustMode !== 'set' && qty === 0)) {
      show(adjustMode === 'set' ? 'أدخل رصيداً صحيحاً (صفر أو أكثر)' : 'أدخل كمية صحيحة أكبر من صفر', 'error');
      return;
    }
    const delta = adjustMode === 'remove' ? -qty : adjustMode === 'add' ? qty : qty - adjustBook.stock_qty;
    if (adjustMode === 'set' && delta === 0) {
      show('الرصيد لم يتغير — لم تُسجل حركة');
      setAdjustBook(null);
      return;
    }
    if (adjustMode === 'remove' && !['correction', 'damaged', 'other'].includes(reason)) {
      show('اختر سبباً مناسباً لخصم المخزون', 'error');
      return;
    }
    setBusy(true);
    try {
      await adminAdjustStock({ bookId: adjustBook.id, delta, targetQty: adjustMode === 'set' ? qty : null, reason: adjustMode === 'set' ? 'correction' : reason, note });
      show('تم تحديث المخزون وتسجيل الحركة ✓');
      setAdjustBook(null);
      await load();
    } catch (err) {
      show(err.message || 'تعذّر تحديث المخزون', 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveBulk = async (event) => {
    event.preventDefault();
    const qty = Number(bulkQty);
    if (!Number.isInteger(qty) || qty < 1 || selected.length === 0) {
      show('اختر كتباً وأدخل كمية صحيحة أكبر من صفر', 'error');
      return;
    }
    setBusy(true);
    try {
      await adminBulkStockIn({ items: selected.map((book_id) => ({ book_id, qty })), reason: bulkReason, note: bulkNote });
      show(`تمت إضافة ${qty} نسخة إلى ${selected.length} كتب وتسجيل الحركات ✓`);
      setSelected([]);
      setBulkOpen(false);
      setBulkQty('');
      setBulkNote('');
      await load();
    } catch (err) {
      show(err.message || 'تعذّر تنفيذ التوريد — لم يتغير أي رصيد', 'error');
    } finally {
      setBusy(false);
    }
  };

  const loadHistory = async (book, reset = true) => {
    setHistoryBook(book);
    setHistoryLoading(true);
    const from = reset ? 0 : historyOffset;
    try {
      const rows = await adminGetStockMovements({ bookId: book.id, from, limit: 50 });
      setHistory((current) => reset ? rows : [...current, ...rows]);
      setHistoryOffset(from + rows.length);
      setHistoryMore(rows.length === 50);
    } catch (err) {
      show(err.message || 'تعذّر تحميل سجل الحركات', 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  const exportCsv = () => {
    const rows = [['العنوان', 'المؤلف', 'ISBN', 'التصنيف', 'الرصيد', 'الحالة'], ...filtered.map((book) => [book.title_ar, book.author_ar || '', book.isbn || '', book.category || '', book.stock_qty ?? 0, isSoldOut(book) ? 'نافد' : book.stock_qty <= LOW_STOCK_AT ? 'منخفض' : 'متوفر'])];
    const csv = `\uFEFF${rows.map((row) => row.map((field) => {
      const text = String(field);
      const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
      return `"${safe.replaceAll('"', '""')}"`;
    }).join(',')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'koutobi-stock.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return <div className="space-y-5">
    <PageHeader title="إدارة المخزون" description="تابع الأرصدة، سجّل التوريد والتعديلات، وراجع سجل كل حركة." crumbs={[{ label: 'لوحة التحكم', to: '/admin/dashboard' }, { label: 'إدارة المخزون' }]} actions={<Button variant="outline" onClick={exportCsv} disabled={!books}><ArrowDownToLine size={16} /> تصدير CSV</Button>} />
    {error && <div role="alert" className="rounded-md bg-rose-50 px-4 py-3 text-sm text-danger">{error}</div>}
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <SummaryCard label="إجمالي النسخ" value={stats.units} icon={Boxes} />
      <SummaryCard label="كتب متوفرة" value={stats.available} icon={ClipboardList} />
      <SummaryCard label="مخزون منخفض" value={stats.low} icon={TriangleAlert} tone="amber" />
      <SummaryCard label="نافد" value={stats.out} icon={TriangleAlert} tone="red" />
    </div>

    <Card className="border-line/70 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative min-w-0 flex-1"><Search size={17} className="absolute start-3 top-1/2 -translate-y-1/2 text-soft" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث بالعنوان، المؤلف، ISBN أو التصنيف…" className="ps-9" aria-label="البحث في المخزون" /></label>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-36" aria-label="تصفية حسب الرصيد"><SelectValue /></SelectTrigger><SelectContent>{FILTERS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select>
          <Select value={category} onValueChange={setCategory}><SelectTrigger className="w-44" aria-label="تصفية حسب التصنيف"><SelectValue placeholder="كل التصنيفات" /></SelectTrigger><SelectContent><SelectItem value="all">كل التصنيفات</SelectItem>{categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
          <Button variant="outline" onClick={load}>تحديث</Button>
        </div>
      </div>
      {selected.length > 0 && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand/20 bg-brand-pale/60 p-3"><span className="text-sm font-semibold text-ink">تم تحديد {selected.length} كتب</span><div className="flex items-center gap-2"><Button variant="ghost" size="sm" onClick={() => setSelected([])}>إلغاء التحديد</Button><Button size="sm" onClick={() => setBulkOpen((value) => !value)}><ArrowDownToLine size={15} /> توريد جماعي</Button></div></div>}
      {bulkOpen && <form onSubmit={saveBulk} className="mt-3 grid gap-3 rounded-lg border border-brand/20 bg-brand-pale/40 p-4 md:grid-cols-[1fr_1fr_2fr_auto]"><label className="text-xs font-semibold text-ink">كمية لكل كتاب<Input type="number" min="1" max="1000000" value={bulkQty} onChange={(e) => setBulkQty(e.target.value)} className="mt-1 bg-white" required /></label><label className="text-xs font-semibold text-ink">سبب التوريد<Select value={bulkReason} onValueChange={setBulkReason}><SelectTrigger className="mt-1 bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="restock">توريد جديد</SelectItem><SelectItem value="customer_return">إرجاع عميل</SelectItem></SelectContent></Select></label><label className="text-xs font-semibold text-ink">ملاحظة مشتركة (اختياري)<Input value={bulkNote} onChange={(e) => setBulkNote(e.target.value)} maxLength={500} className="mt-1 bg-white" placeholder="رقم فاتورة أو تفاصيل التوريد" /></label><Button type="submit" disabled={busy} className="self-end">{busy ? 'جارٍ التسجيل…' : 'تأكيد التوريد'}</Button></form>}
    </Card>

    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="flex items-center justify-between border-b border-line px-4 py-3"><h2 className="text-sm font-bold text-ink">الأصناف ({filtered.length})</h2><label className="flex items-center gap-2 text-xs text-soft"><input type="checkbox" checked={filtered.length > 0 && filtered.every((book) => selected.includes(book.id))} onChange={selectVisible} aria-label="تحديد الكتب الظاهرة" /> تحديد النتائج</label></div>
      {!books ? <div className="p-10 text-center text-sm text-soft">جارٍ تحميل المخزون…</div> : filtered.length === 0 ? <div className="p-10 text-center text-sm text-soft">لا توجد كتب مطابقة للفلاتر.</div> : <div className="divide-y divide-line/70">{filtered.map((book) => {
        const last = lastMovement.get(book.id);
        const isAdjusting = adjustBook?.id === book.id;
        const isHistory = historyBook?.id === book.id;
        const quantityNum = Number(quantity);
        const projected = adjustMode === 'set' ? quantityNum : (book.stock_qty || 0) + (adjustMode === 'remove' ? -quantityNum : quantityNum);
        const reasonChoices = adjustMode === 'add' ? [['restock', 'توريد جديد'], ['customer_return', 'إرجاع عميل'], ['other', 'سبب آخر']] : [['correction', 'تصحيح الجرد'], ['damaged', 'تالف أو مفقود'], ['other', 'سبب آخر']];
        return <div key={book.id} className={`p-3 sm:p-4 ${focusBookId === book.id ? 'bg-brand-pale/50 ring-1 ring-inset ring-brand/20' : ''}`}>
          <div className="flex flex-wrap items-center gap-3">
            <input type="checkbox" checked={selected.includes(book.id)} onChange={() => toggleSelected(book.id)} aria-label={`تحديد ${book.title_ar}`} />
            <BookCover src={book.cover_image} alt="" className="h-14 w-10 shrink-0 overflow-hidden rounded border border-line bg-gray-50" imgClassName="h-full w-full object-cover" />
            <div className="min-w-0 flex-1"><div dir="auto" className="truncate text-sm font-bold text-ink">{book.title_ar}</div><div dir="auto" className="truncate text-xs text-soft">{book.author_ar || '—'} · {book.category || '—'}{book.isbn && <> · <bdi dir="ltr" className="inline-block font-mono">ISBN {book.isbn}</bdi></>}</div><div className="mt-1 text-[11px] text-soft">آخر حركة: {last ? formatDate(last.created_at) : 'لا توجد'}</div></div>
            <div className="min-w-20 text-center"><div className={`text-xl font-bold tabular-nums ${(book.stock_qty ?? 0) === 0 ? 'text-danger' : book.stock_qty <= LOW_STOCK_AT ? 'text-amber-600' : 'text-brand'}`}>{book.stock_qty ?? 0}</div><InventoryStatus book={book} /></div>
            <div className="flex items-center gap-1"><Button variant="outline" size="sm" onClick={() => openAdjust(book)}><Settings2 size={15} /> تعديل</Button><Button variant="ghost" size="icon" onClick={() => isHistory ? setHistoryBook(null) : loadHistory(book)} aria-label={`سجل ${book.title_ar}`} title="سجل الحركات"><History size={17} /></Button></div>
          </div>
          {isAdjusting && <form onSubmit={saveAdjustment} className="mt-4 grid gap-3 rounded-lg border border-line bg-gray-50 p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><div className="text-sm font-bold text-ink">تعديل رصيد: {book.title_ar}</div><div className="text-xs text-soft">الحالي <b className="tabular-nums text-ink">{book.stock_qty ?? 0}</b> ← بعد التعديل <b className={`tabular-nums ${projected < 0 ? 'text-danger' : 'text-brand'}`}>{Number.isFinite(projected) ? projected : '—'}</b></div></div>
            <div className="grid gap-3 sm:grid-cols-3"><label className="text-xs font-semibold text-ink">نوع التعديل<Select value={adjustMode} onValueChange={(value) => { setAdjustMode(value); setReason(value === 'add' ? 'restock' : 'correction'); setQuantity(''); }}><SelectTrigger aria-label="نوع التعديل" className="mt-1 bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="add">إضافة كمية</SelectItem><SelectItem value="remove">خصم كمية</SelectItem><SelectItem value="set">ضبط الرصيد الفعلي</SelectItem></SelectContent></Select></label><label className="text-xs font-semibold text-ink">{adjustMode === 'set' ? 'الرصيد الفعلي بعد الجرد' : 'الكمية'}<Input type="number" min={adjustMode === 'set' ? 0 : 1} max="1000000" value={quantity} onChange={(e) => setQuantity(e.target.value)} required className="mt-1 bg-white" /></label><label className="text-xs font-semibold text-ink">سبب الحركة<Select value={adjustMode === 'set' ? 'correction' : reason} onValueChange={setReason} disabled={adjustMode === 'set'}><SelectTrigger aria-label="سبب الحركة" className="mt-1 bg-white"><SelectValue /></SelectTrigger><SelectContent>{reasonChoices.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></label></div>
            <label className="text-xs font-semibold text-ink">ملاحظة أو مرجع (اختياري)<Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} className="mt-1 resize-y bg-white" placeholder="مثال: فاتورة التوريد رقم…" /></label>
            {projected < 0 && <p role="alert" className="text-xs font-semibold text-danger">لا يمكن أن يصبح الرصيد سالباً.</p>}
            <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setAdjustBook(null)}>إلغاء</Button><Button type="submit" disabled={busy || !quantity || projected < 0}>{busy ? 'جارٍ التسجيل…' : 'تأكيد وتسجيل الحركة'}</Button></div>
          </form>}
          {isHistory && <div className="mt-4 rounded-lg border border-line bg-gray-50 p-3 sm:p-4"><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold text-ink">سجل حركات «{book.title_ar}»</h3><Button variant="ghost" size="sm" onClick={() => setHistoryBook(null)}>إغلاق</Button></div><MovementList movements={history} loading={historyLoading} hasMore={historyMore} onMore={() => loadHistory(book, false)} /></div>}
        </div>;
      })}</div>}
    </div>
  </div>;
}
