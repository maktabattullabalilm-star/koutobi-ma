import { useEffect, useMemo, useState } from 'react';
import { adminGetOrders, adminUpdateOrderStatus } from '../../lib/admin';
import { formatPrice, formatDate } from '../../lib/format';
import { whatsappLink } from '../../lib/config';
import { useToast } from '../../components/Toast';
import { IconWhatsApp } from '../../components/icons';
import PageHeader from './PageHeader';
import StatusPill from './StatusPill';

const STATUS = [
  { id: 'new', label: 'جديد', tone: 'amber' },
  { id: 'contacted', label: 'تم التواصل', tone: 'blue' },
  { id: 'delivered', label: 'تم التوصيل', tone: 'green' },
  { id: 'cancelled', label: 'ملغى', tone: 'gray' },
];

export default function OrdersAdmin() {
  const [orders, setOrders] = useState(null);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const { show } = useToast();

  const load = () => {
    setError('');
    adminGetOrders()
      .then(setOrders)
      .catch((e) => setError(e.message));
  };
  useEffect(load, []);

  const filtered = useMemo(() => {
    if (!orders) return [];
    return filter === 'all' ? orders : orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  const counts = useMemo(() => {
    const c = { all: orders?.length || 0, new: 0, contacted: 0, delivered: 0, cancelled: 0 };
    (orders || []).forEach((o) => (c[o.status] = (c[o.status] || 0) + 1));
    return c;
  }, [orders]);

  const setStatus = async (id, status) => {
    try {
      await adminUpdateOrderStatus(id, status);
      show('تم تحديث حالة الطلب ✓');
      load();
    } catch (e) {
      show(e.message, 'error');
    }
  };

  const tab = (id, label) => (
    <button
      key={id}
      onClick={() => setFilter(id)}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        filter === id ? 'bg-brand text-white' : 'bg-white text-ink ring-1 ring-inset ring-line hover:bg-gray-50'
      }`}
    >
      {label}
      <span className={`ms-1.5 rounded-full px-1.5 py-0.5 text-[11px] ${filter === id ? 'bg-white/20' : 'bg-brand-pale text-brand'}`}>
        {counts[id] ?? 0}
      </span>
    </button>
  );

  return (
    <div>
      <PageHeader
        title="طلبات الدفع عند الاستلام 📦"
        description="تواصل مع العميل هاتفياً وأكّد الطلب قبل الشحن."
        crumbs={[{ label: 'لوحة التحكم', to: '/admin/dashboard' }, { label: 'الطلبات' }]}
      />

      {error && <div className="mb-4 rounded-md bg-rose-50 px-4 py-3 text-sm text-danger">{error}</div>}

      <div className="flex flex-wrap gap-2">
        {tab('all', 'الكل')}
        {STATUS.map((s) => tab(s.id, s.label))}
      </div>

      <div className="mt-4 space-y-4">
        {!orders ? (
          <>
            <div className="skeleton h-44 w-full" />
            <div className="skeleton h-44 w-full" />
          </>
        ) : filtered.length === 0 ? (
          <div className="card border border-line/60 p-10 text-center text-soft">
            لا توجد طلبات في هذه الحالة.
          </div>
        ) : (
          filtered.map((o) => (
            <div key={o.id} className="card border border-line/60 p-4 sm:p-5">
              {/* header */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-ink">{o.customer_name}</span>
                    <a href={`tel:${o.phone}`} className="text-sm font-medium text-brand hover:text-brand-dark" dir="ltr">☎ {o.phone}</a>
                  </div>
                  <div className="mt-0.5 text-xs text-soft">
                    <time>{formatDate(o.created_at)}</time>
                    <span className="ms-2 text-gray-500" dir="ltr">#{o.id.slice(0, 8)}</span>
                  </div>
                </div>
                <StatusPill tone={STATUS.find((s) => s.id === o.status)?.tone || 'gray'}>
                  {STATUS.find((s) => s.id === o.status)?.label || o.status}
                </StatusPill>
              </div>

              {/* items */}
              <ul className="mt-3 space-y-1.5 border-y border-line/60 py-3 text-sm">
                {(o.order_items || []).map((it, i) => (
                  <li key={i} className="flex items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="font-medium text-ink">{it.title_ar || 'كتاب'}</span>
                      <span className="ms-2 text-xs text-soft">×{it.quantity}</span>
                    </span>
                    <span className="shrink-0 font-semibold text-ink">{formatPrice(Number(it.price) * it.quantity)}</span>
                  </li>
                ))}
              </ul>

              {/* meta */}
              <div className="mt-3 grid gap-1.5 text-xs text-soft sm:grid-cols-2">
                {o.city && <span>🏙️ المدينة: <b className="font-medium text-ink">{o.city}</b></span>}
                <span>📍 العنوان: <b className="font-medium text-ink">{o.address}</b></span>
                {o.notes && <span className="sm:col-span-2">📝 ملاحظات: <b className="font-medium text-ink">{o.notes}</b></span>}
              </div>

              {/* actions */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm font-bold text-ink">
                  الإجمالي: <span className="text-lg font-bold text-brand">{formatPrice(o.total)}</span>
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={whatsappLink(
                      `السلام عليكم ${o.customer_name} 🌱، بخصوص طلبكم من مكتبة كُتُبِي.ما:\n${(o.order_items || []).map((it) => `• ${it.title_ar} (×${it.quantity})`).join('\n')}\nالإجمالي: ${formatPrice(o.total)}`
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-ghost !bg-[#25D366]/10 !border-[#25D366]/40"
                  >
                    <IconWhatsApp width={16} height={16} /> اتصال واتساب
                  </a>
                  <select
                    value={o.status}
                    onChange={(e) => setStatus(o.id, e.target.value)}
                    className="rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-ink outline-none focus:border-brand"
                  >
                    {STATUS.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}