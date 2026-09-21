import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminGetBooks, adminGetOrders, adminStats } from '../../lib/admin';
import { supabase } from '../../lib/supabase';
import { getVerifiedTotpFactor } from '../../lib/mfa';
import { useToast } from '../../components/Toast';
import { formatPrice, formatDate } from '../../lib/format';
import { IconBook, IconCart, IconInbox, IconCash } from '../../components/icons';
import PageHeader from './PageHeader';
import StatusPill from './StatusPill';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STATUS_LABEL = {
  new: 'جديد',
  contacted: 'تم التواصل',
  delivered: 'تم التوصيل',
  cancelled: 'ملغى',
};

const LOW_STOCK_AT = 5;

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [error, setError] = useState('');
  const [mfaOff, setMfaOff] = useState(false);
  const { show } = useToast();

  useEffect(() => {
    Promise.all([adminStats(), adminGetOrders(), adminGetBooks()])
      .then(([s, list, books]) => {
        setStats(s);
        setOrders(list.slice(0, 6));
        setLowStock(books.filter((b) => (b.stock_qty ?? 0) <= LOW_STOCK_AT));
      })
      .catch((e) => setError(e.message));
    getVerifiedTotpFactor(supabase)
      .then((f) => setMfaOff(!f))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cards = stats
    ? [
        { label: 'إجمالي الكتب', value: String(stats.books), Icon: IconBook, color: 'bg-brand-light text-brand', to: '/admin/books' },
        { label: 'إجمالي الطلبات', value: String(stats.orders), Icon: IconCart, color: 'bg-sky-100 text-sky-700', to: '/admin/orders' },
        { label: 'طلبات قيد المعالجة', value: String(stats.pending), Icon: IconInbox, color: 'bg-amber-100 text-amber-700', to: '/admin/orders' },
        { label: 'إيرادات (تم التوصيل)', value: formatPrice(stats.revenue), Icon: IconCash, color: 'bg-rose-100 text-rose-700', to: '/admin/orders' },
      ]
    : [];

  const attentionCount = (stats?.pending || 0) + lowStock.length + (mfaOff ? 1 : 0);
  // Triage order: fully out of stock (red) → pending orders → low stock → security nudge.
  const outOfStock = lowStock.filter((b) => (b.stock_qty ?? 0) <= 0);
  const runningLow = lowStock.filter((b) => (b.stock_qty ?? 0) > 0);

  return (
    <div>
      <PageHeader
        title="نظرة عامة 👋"
        description="ملخص أداء مكتبتك وطلبات «الدفع عند الاستلام»."
        actions={
          <Button asChild>
            <Link to="/admin/books/new">＋ إضافة كتاب</Link>
          </Button>
        }
      />

      {error && <div className="mb-4 rounded-md bg-rose-50 px-4 py-3 text-sm text-danger">{error}</div>}

      {/* stats */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to}>
            <Card className="border-line/60 p-5 transition hover:border-brand/40 hover:shadow-lift">
              <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${c.color}`}>
                <c.Icon width={22} height={22} />
              </span>
              <div className="mt-3 text-xl font-bold tabular-nums text-ink">{c.value}</div>
              <div className="mt-0.5 text-xs text-soft">{c.label}</div>
            </Card>
          </Link>
        ))}
      </section>

      {/* needs attention */}
      <Card className="mt-6 border-line/60 p-5">
        <div className="flex items-center justify-between">
          <h2 className="admin-section-title">يحتاج انتباهك</h2>
          {attentionCount > 0 ? (
            <StatusPill tone="amber">{attentionCount}</StatusPill>
          ) : (
            <StatusPill tone="green">كل شيء تمام ✓</StatusPill>
          )}
        </div>
        <ul className="mt-3 space-y-2 text-sm">
          {outOfStock.map((b) => (
            <li key={b.id}>
              <Link to={`/admin/books/${b.id}/edit`} className="flex items-center justify-between gap-3 rounded-md bg-rose-50/60 px-3 py-2.5 text-ink ring-1 ring-inset ring-rose-200/60 hover:bg-rose-50">
                <span className="min-w-0 truncate">«{b.title_ar}» — نفد المخزون</span>
                <StatusPill tone="red">نفد ←</StatusPill>
              </Link>
            </li>
          ))}
          {stats && stats.pending > 0 && (
            <li>
              <Link to="/admin/orders" className="flex items-center justify-between gap-3 rounded-md bg-amber-50 px-3 py-2.5 text-amber-800 ring-1 ring-inset ring-amber-200 hover:bg-amber-100">
                <span>لديك {stats.pending} طلب قيد المعالجة — اتصل بالعملاء للتأكيد</span>
                <StatusPill tone="amber">طلبات ←</StatusPill>
              </Link>
            </li>
          )}
          {runningLow.map((b) => (
            <li key={b.id}>
              <Link to={`/admin/books/${b.id}/edit`} className="flex items-center justify-between gap-3 rounded-md bg-amber-50/50 px-3 py-2.5 text-ink ring-1 ring-inset ring-amber-200/60 hover:bg-amber-50">
                <span className="min-w-0 truncate">«{b.title_ar}» — المخزون {(b.stock_qty ?? 0)}</span>
                <StatusPill tone="amber">قارب ←</StatusPill>
              </Link>
            </li>
          ))}
          {mfaOff && (
            <li>
              <Link to="/admin/settings" className="flex items-center justify-between gap-3 rounded-md bg-gray-50 px-3 py-2.5 text-ink ring-1 ring-inset ring-line hover:bg-gray-100">
                <span>الحساب محمي بكلمة المرور فقط — فعّل التحقق بخطوتين من الإعدادات</span>
                <StatusPill tone="gray">أمان ←</StatusPill>
              </Link>
            </li>
          )}
          {attentionCount === 0 && (
            <li className="rounded-md bg-gray-50 px-3 py-2.5 text-xs text-soft">لا طلبات معلقة، ولا نقص مخزون، والحماية مفعّلة.</li>
          )}
        </ul>
      </Card>

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* recent orders */}
        <Card className="border-line/60 p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="admin-section-title">أحدث الطلبات</h2>
            <Button variant="link" asChild className="h-auto p-0 text-sm font-semibold text-brand">
              <Link to="/admin/orders">عرض الكل ←</Link>
            </Button>
          </div>
          {orders.length === 0 ? (
            <p className="mt-4 rounded-md bg-gray-50 px-4 py-8 text-center text-sm text-soft">
              لا توجد طلبات بعد — شارك عنوان متجرك مع عملائك.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-line/70">
              {orders.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-brand" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-ink">{o.customer_name}</div>
                    <div className="text-xs tabular-nums text-soft" dir="ltr">{o.phone}</div>
                  </div>
                  <span className="text-xs text-soft">{formatDate(o.created_at)}</span>
                  <span className="text-sm font-bold tabular-nums text-brand">{formatPrice(o.total)}</span>
                  <StatusPill tone="blue">
                    {STATUS_LABEL[o.status] || o.status}
                  </StatusPill>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* quick actions */}
        <Card className="border-line/60 p-5">
          <h2 className="admin-section-title">إجراءات سريعة</h2>
          <CardContent className="mt-4 space-y-2.5 p-0">
            <Button asChild className="w-full">
              <Link to="/admin/books/new">＋ إضافة كتاب جديد</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/admin/books">إدارة الكتب</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/admin/catalog">بيانات الكتالوج</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/admin/orders">متابعة الطلبات</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/admin/settings">الإعدادات ⚙️</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <a href="/" target="_blank" rel="noreferrer">معاينة المتجر ↗</a>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
