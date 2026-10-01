import { useEffect, useMemo, useState } from 'react';
import { adminGetOrders, adminUpdateOrderStatus } from '../../lib/admin';
import { formatPrice, formatDate } from '../../lib/format';
import { ORDER_STATUS } from '../../lib/constants';
import { orderWhatsApp } from '../../lib/whatsapp';
import { maskPhone, sanitizeTelHref } from '../../lib/validators';
import { useToast } from '../../components/Toast';
import { IconWhatsApp } from '../../components/icons';
import PageHeader from '../../components/admin/PageHeader';
import StatusPill from '../../components/admin/StatusPill';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const STATUS = Object.entries(ORDER_STATUS).map(([id, { label, tone }]) => ({ id, label, tone }));

/** Phone shown masked; click reveals full number (PII minimization). */
function PhoneReveal({ phone }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="inline-flex items-center gap-1.5" dir="ltr">
      <a
        href={sanitizeTelHref(phone)}
        className="text-sm font-medium text-brand hover:text-brand-dark"
        title={open ? phone : undefined}
      >
        ☎ {open ? phone : maskPhone(phone)}
      </a>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-[11px] text-soft underline hover:text-ink"
      >
        {open ? 'إخفاء' : 'إظهار'}
      </button>
    </span>
  );
}

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
      show(status === 'contacted' ? 'تم تأكيد الطلب وخصم الكميات من المخزون ✓' : status === 'cancelled' ? 'تم إلغاء الطلب وتحديث المخزون تلقائياً ✓' : 'تم تحديث حالة الطلب ✓');
      load();
    } catch (e) {
      const message = /insufficient stock/i.test(e.message)
        ? 'لا توجد كمية كافية لتأكيد الطلب — حدّث المخزون أولاً.'
        : /book missing/i.test(e.message)
          ? 'تعذّر تأكيد الطلب لأن أحد كتبه لم يعد موجوداً في المخزون.'
          : /invalid status transition/i.test(e.message)
            ? 'لا يمكن الانتقال من هذه الحالة إلى الحالة المختارة.'
            : e.message;
      show(message, 'error');
    }
  };

  const tab = (id, label) => (
    <button
      key={id}
      onClick={() => setFilter(id)}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        filter === id
          ? 'bg-brand text-white'
          : 'bg-white text-ink ring-1 ring-inset ring-line hover:bg-gray-50'
      }`}
    >
      {label}
      <span
        className={`ms-1.5 rounded-full px-1.5 py-0.5 text-[11px] ${filter === id ? 'bg-white/20' : 'bg-brand-pale text-brand'}`}
      >
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
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-44 w-full" />
          </>
        ) : filtered.length === 0 ? (
          <div className="card border border-line/60 p-10 text-center text-soft">
            لا توجد طلبات في هذه الحالة.
          </div>
        ) : (
          filtered.map((o, idx) => (
            <Card key={o.id} className="border-line/60 p-4 sm:p-5">
              {/* header */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <bdi dir="auto" className="font-bold text-ink">{o.customer_name}</bdi>
                    <PhoneReveal phone={o.phone} />
                  </div>
                  <div className="mt-0.5 text-xs text-soft">
                    <time>{formatDate(o.created_at)}</time>
                    <span className="ms-2 text-gray-500" title={o.id}>
                      طلب #<bdi dir="ltr">{idx + 1}</bdi>
                    </span>
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
                       <bdi dir="auto" className="font-medium text-ink">{it.title_ar || 'كتاب'}</bdi>
                      <span className="ms-2 text-xs text-soft"><bdi dir="ltr">×{it.quantity}</bdi></span>
                    </span>
                    <span className="shrink-0 font-semibold text-ink">
                      {formatPrice(Number(it.price) * it.quantity)}
                    </span>
                  </li>
                ))}
              </ul>

              {/* meta */}
              <div className="mt-3 grid gap-1.5 text-xs text-soft sm:grid-cols-2">
                {o.city && (
                  <span>
                    🏙️ المدينة: <bdi dir="auto" className="font-medium text-ink">{o.city}</bdi>
                  </span>
                )}
                <span>
                  📍 العنوان: <bdi dir="auto" className="font-medium text-ink">{o.address}</bdi>
                </span>
                {o.notes && (
                  <span className="sm:col-span-2">
                    📝 ملاحظات: <bdi dir="auto" className="font-medium text-ink">{o.notes}</bdi>
                  </span>
                )}
              </div>

              {/* actions */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm font-bold text-ink">
                  الإجمالي: <span className="text-lg font-bold text-brand">{formatPrice(o.total)}</span>
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    asChild
                    variant="outline"
                    className="border-[#25D366]/40 bg-[#25D366]/10 hover:bg-[#25D366]/20"
                  >
                    <a href={orderWhatsApp(o)} target="_blank" rel="noreferrer noopener">
                      <IconWhatsApp width={16} height={16} /> اتصال واتساب
                    </a>
                  </Button>
                  {['new', 'contacted'].includes(o.status) ? <Select value={o.status} onValueChange={(v) => setStatus(o.id, v)}>
                    <SelectTrigger className="w-auto" aria-label="حالة الطلب"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(o.status === 'new' ? STATUS.filter((s) => ['new', 'contacted', 'cancelled'].includes(s.id)) : STATUS.filter((s) => ['contacted', 'delivered', 'cancelled'].includes(s.id))).map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select> : <span className="text-xs text-soft">لا يمكن تغيير الحالة النهائية</span>}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
