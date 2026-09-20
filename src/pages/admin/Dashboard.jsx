import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminStats, adminGetOrders } from '../../lib/admin';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/Toast';
import { formatPrice, formatDate } from '../../lib/format';
import { IconBook, IconCart, IconInbox, IconCash } from '../../components/icons';

const STATUS_LABEL = {
  new: 'جديد',
  contacted: 'تم التواصل',
  delivered: 'تم التوصيل',
  cancelled: 'ملغى',
};

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [newPass, setNewPass] = useState('');
  const [passMsg, setPassMsg] = useState('');
  const [passBusy, setPassBusy] = useState(false);
  const { show } = useToast();

  const changePassword = async (e) => {
    e.preventDefault();
    setPassMsg('');
    if (newPass.length < 8) {
      setPassMsg('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }
    setPassBusy(true);
    try {
      const { error: upErr } = await supabase.auth.updateUser({ password: newPass });
      if (upErr) throw upErr;
      setNewPass('');
      setPassMsg('تم تغيير كلمة المرور بنجاح ✓');
      show('تم تغيير كلمة المرور ✓');
    } catch (err) {
      setPassMsg(err?.message || 'تعذّر تغيير كلمة المرور');
    } finally {
      setPassBusy(false);
    }
  };

  useEffect(() => {
    adminStats()
      .then((s) => {
        setStats(s);
        return adminGetOrders();
      })
      .then((list) => setOrders(list.slice(0, 6)))
      .catch((e) => setError(e.message));
  }, []);

  const cards = stats
    ? [
        { label: 'إجمالي الكتب', value: String(stats.books), Icon: IconBook, color: 'bg-brand-light text-brand' },
        { label: 'إجمالي الطلبات', value: String(stats.orders), Icon: IconCart, color: 'bg-sky-100 text-sky-700' },
        { label: 'طلبات قيد المعالجة', value: String(stats.pending), Icon: IconInbox, color: 'bg-amber-100 text-amber-700' },
        { label: 'إيرادات (تم التوصيل)', value: formatPrice(stats.revenue), Icon: IconCash, color: 'bg-rose-100 text-rose-700' },
      ]
    : [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">نظرة عامة 👋</h1>
      <p className="mt-1 text-sm text-soft">ملخص أداء مكتبتك وطلبات «الدفع عند الاستلام».</p>

      {error && <div className="mt-4 rounded-md bg-rose-50 px-4 py-3 text-sm text-danger">{error}</div>}

      <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card border border-line/60 p-5">
            <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${c.color}`}>
              <c.Icon width={22} height={22} />
            </span>
            <div className="mt-3 text-xl font-bold text-ink">{c.value}</div>
            <div className="mt-0.5 text-xs text-soft">{c.label}</div>
          </div>
        ))}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* recent orders */}
        <div className="card border border-line/60 p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-ink">أحدث الطلبات</h2>
            <Link to="/admin/orders" className="text-sm font-semibold text-brand hover:text-brand-dark">عرض الكل ←</Link>
          </div>
          {orders.length === 0 ? (
            <p className="mt-4 rounded-md bg-gray-50 px-4 py-8 text-center text-sm text-soft">
              لا توجد طلبات بعد — شارك رابط المتجر مع عملائك.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-line/70">
              {orders.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-brand" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-ink">{o.customer_name}</div>
                    <div className="text-xs text-soft" dir="ltr">{o.phone}</div>
                  </div>
                  <span className="text-xs text-soft">{formatDate(o.created_at)}</span>
                  <span className="text-sm font-bold text-brand">{formatPrice(o.total)}</span>
                  <span className="rounded-full bg-brand-pale px-2.5 py-1 text-[11px] font-bold text-brand">
                    {STATUS_LABEL[o.status] || o.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* quick actions */}
        <div className="card border border-line/60 p-5">
          <h2 className="text-base font-bold text-ink">إجراءات سريعة</h2>
          <div className="mt-4 space-y-2.5">
            <Link to="/admin/books/new" className="btn-primary w-full">＋ إضافة كتاب جديد</Link>
            <Link to="/admin/books" className="btn-ghost w-full">إدارة الكتب</Link>
            <Link to="/admin/orders" className="btn-ghost w-full">متابعة الطلبات</Link>
            <a href="/" target="_blank" rel="noreferrer" className="btn-ghost w-full">معاينة المتجر ↗</a>
          </div>

          {stats && stats.pending > 0 && (
            <div className="mt-5 rounded-md bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-700">
              لديك {stats.pending} طلب قيد المعالجة. يُنصح بالاتصال بالعملاء وتأكيد الطلبات في أسرع وقت.
            </div>
          )}

          <form onSubmit={changePassword} className="mt-5 border-t border-line pt-4">
            <h3 className="text-sm font-bold text-ink">تغيير كلمة المرور 🔒</h3>
            <div className="mt-2 flex gap-2">
              <input
                type="password"
                dir="ltr"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="كلمة مرور جديدة"
                className="input flex-1 !py-2 !text-right"
              />
              <button type="submit" disabled={passBusy} className="btn-ghost shrink-0 !px-4 !py-2">
                {passBusy ? '…' : 'حفظ'}
              </button>
            </div>
            {passMsg && <p className="mt-1.5 text-xs text-soft">{passMsg}</p>}
          </form>
        </div>
      </section>
    </div>
  );
}