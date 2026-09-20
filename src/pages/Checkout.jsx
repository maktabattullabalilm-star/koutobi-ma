import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { createOrder } from '../lib/api';
import { formatPrice } from '../lib/format';
import { whatsappLink } from '../lib/config';
import BookCover from '../components/BookCover';
import { useToast } from '../components/Toast';
import { IconCart, IconCash, IconHeadset } from '../components/icons';

export default function Checkout() {
  const { items, total, count, clear } = useCart();
  const { show } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', phone: '', city: '', address: '', notes: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (form.name.trim().length < 3) e.name = 'الرجاء إدخال الاسم كاملاً';
    if (!/^[0-9+\s-]{9,15}$/.test(form.phone.trim())) e.phone = 'أدخل رقم هاتف صحيح (مثال: 0612345678)';
    if (form.address.trim().length < 8) e.address = 'أدخل عنواناً تفصيلياً لضمان التوصيل';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    setSubmitting(true);
    try {
      const res = await createOrder({
        name: form.name.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        address: form.address.trim(),
        notes: form.notes.trim(),
        items: items.map((it) => ({ id: it.id, title: it.title, price: it.price, qty: it.qty })),
      });
      sessionStorage.setItem(
        'koutobi_last_order',
        JSON.stringify({ id: res.id, total: res.total, name: form.name.trim(), phone: form.phone.trim(), demo: !!res.demo })
      );
      clear();
      if (res.adjusted?.length) {
        show(`تم تعديل الكمية حسب المتوفر: ${res.adjusted.map((a) => `«${a.title}» أصبحت ${a.given}`).join('، ')}`);
      } else {
        show('تم استلام طلبك بنجاح 🎉');
      }
      navigate('/thank-you', { replace: true });
    } catch (err) {
      show(`تعذّر إرسال الطلب: ${err.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const field = (label, name, placeholder, type = 'text') => (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-ink">{label}</label>
      <input
        id={name}
        type={type}
        placeholder={placeholder}
        value={form[name]}
        onChange={set(name)}
        className="input"
      />
      {errors[name] && <p className="mt-1 text-xs font-medium text-danger">{errors[name]}</p>}
    </div>
  );

  if (items.length === 0) {
    return (
      <div className="container-x py-16 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <IconCart width={28} height={28} />
        </span>
        <h1 className="mt-4 text-xl font-bold text-ink">لا يوجد ما يمكن تأكيده</h1>
        <p className="mt-1 text-sm text-soft">سلتك فارغة — أضف بعض الكتب أولاً.</p>
        <Link to="/catalog" className="btn-primary mt-6">اذهب إلى المكتبة</Link>
      </div>
    );
  }

  return (
    <div className="container-x py-8">
      <h1 className="mb-1 text-2xl font-bold text-ink sm:text-3xl">إتمام الطلب 📦</h1>
      <p className="mb-6 text-sm text-soft">أدخل بيانات التوصيل وسنتصل بك هاتفياً للتأكيد.</p>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* form */}
        <form onSubmit={submit} noValidate className="space-y-4 lg:col-span-2">
          <section className="card border border-line/60 p-5">
            <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-ink">
              <IconHeadset width={18} height={18} className="text-brand" /> بيانات التوصيل
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {field('الاسم الكامل *', 'name', 'مثال: محمد الأحمدي')}
              {field('رقم الهاتف *', 'phone', 'مثال: 0612345678', 'tel')}
              {field('المدينة', 'city', 'مثال: الدار البيضاء')}
              <div className="sm:col-span-2">
                {field('العنوان التفصيلي *', 'address', 'الحي، الشارع، رقم المنزل…')}
              </div>
              <div className="sm:col-span-2">
                {field('ملاحظات (اختياري)', 'notes', 'أي تفاصيل إضافية لمساعدتنا')}
              </div>
            </div>
          </section>

          <section className="card border border-line/60 bg-brand-pale p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-brand-dark">
              <IconCash width={18} height={18} /> الدفع عند الاستلام 💵
            </h2>
            <p className="mt-1.5 text-xs leading-5 text-brand-dark/80">
              لا حاجة لأي بطاقة بنكية. ادفع نقداً عند استلام كتابك من موصل الطلبات.
            </p>
          </section>

          <button type="submit" disabled={submitting} className="btn-primary w-full py-4! text-base">
            {submitting ? 'جارٍ إرسال الطلب…' : `تأكيد الطلب — ${formatPrice(total)}`}
          </button>
        </form>

        {/* summary */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card border border-line/60 bg-white p-5">
            <h2 className="text-base font-bold text-ink">طلبك ({count})</h2>
            <ul className="mt-3 space-y-2.5 border-b border-line pb-4">
              {items.map((it) => {
                const stock = it.stock ?? 99;
                const clamped = stock < it.qty;
                return (
                  <li key={it.id} className="flex items-center gap-3 text-sm">
                    <BookCover src={it.cover} alt={it.title} className="h-12 w-9 rounded-sm border border-line" imgClassName="h-full w-full rounded-sm object-cover" />
                    <span className="flex-1 line-clamp-1 font-medium text-ink">{it.title}</span>
                    <span className="shrink-0 text-xs text-soft">×{it.qty}</span>
                    {clamped && (
                      <span className="shrink-0 text-xs text-danger bg-rose-50 px-2 py-0.5 rounded-sm">
                        تم تقليص الكمية إلى المخزون ({stock})
                      </span>
                    )}
                    <span className="shrink-0 font-semibold text-brand">{formatPrice(it.price * it.qty)}</span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="font-bold text-ink">الإجمالي</span>
              <span className="text-lg font-bold text-brand">{formatPrice(total)}</span>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-soft">
              سيتم الاتصال بك هاتفياً لتأكيد الطلب وتحديد تكلفة التوصيل قبل الشحن.
            </p>
          </div>

          <div className="mt-4 rounded-card border border-line/60 bg-gray-50 p-4 text-center text-sm text-soft">
            تفضّل الطلب مباشرة؟{' '}
            <a
              href={whatsappLink(
                `السلام عليكم، أريد تأكيد الطلب التالي:\n${items.map((it) => `• ${it.title} (×${it.qty}) — ${formatPrice(it.price * it.qty)}`).join('\n')}\nالإجمالي: ${formatPrice(total)}\nالاسم: ${form.name}\nالهاتف: ${form.phone}\nالعنوان: ${form.address}`
              )}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-brand hover:text-brand-dark"
            >
              تواصل عبر واتساب
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}