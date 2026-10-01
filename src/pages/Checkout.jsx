import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { createOrder } from '../lib/api';
import { CART_MAX_QTY, STORAGE_KEYS } from '../lib/constants';
import { validateOrder } from '../lib/validators';
import { formatPrice } from '../lib/format';
import { checkoutOrderLink } from '../lib/whatsapp';
import { useSiteContact } from '../hooks/useSiteContact';
import { useToast } from '../components/Toast';
import { IconCart, IconCash, IconHeadset } from '../components/icons';
import BookCover from '../components/BookCover';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export default function Checkout() {
  const { items, total, count, clear } = useCart();
  const { whatsapp } = useSiteContact();
  const { show } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', phone: '', city: '', address: '', notes: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => validateOrder(form);

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      show('لا يوجد اتصال بالإنترنت — تحقق من الشبكة ثم أعد المحاولة', 'error');
      return;
    }

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
        STORAGE_KEYS.lastOrder,
        JSON.stringify({
          id: res.id,
          total: res.total,
          name: form.name.trim(),
          phone: form.phone.trim(),
          demo: !!res.demo,
        })
      );
      clear();
      if (res.adjusted?.length) {
        show(
          `تم تعديل الكمية حسب المتوفر: ${res.adjusted.map((a) => `«${a.title}» أصبحت ${a.given}`).join('، ')}`
        );
      } else {
        show('تم استلام طلبك');
      }
      navigate('/thank-you', { replace: true });
    } catch (err) {
      show(`تعذّر إرسال الطلب: ${err.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const field = (label, name, placeholder, type = 'text', maxLength, opts = {}) => (
    <Field>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input
        id={name}
        name={name}
        type={type}
        dir={opts.dir || (name === 'phone' ? 'ltr' : 'auto')}
        placeholder={placeholder}
        value={form[name]}
        onChange={set(name)}
        maxLength={maxLength}
        autoComplete={opts.autoComplete}
        inputMode={opts.inputMode}
        required={opts.required}
        aria-invalid={errors[name] ? true : undefined}
        aria-describedby={errors[name] ? `${name}-error` : undefined}
      />
      {errors[name] && <FieldError id={`${name}-error`}>{errors[name]}</FieldError>}
    </Field>
  );

  if (items.length === 0) {
    return (
      <div className="container-x py-16 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <IconCart width={28} height={28} />
        </span>
        <h1 className="mt-4 text-xl font-bold text-ink">لا يوجد ما يمكن تأكيده</h1>
        <p className="mt-1 text-sm text-soft">سلتك فارغة — أضف بعض الكتب أولاً.</p>
        <Button asChild className="mt-6">
          <Link to="/catalog">اذهب إلى المكتبة</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container-x py-8">
      <h1 className="mb-1 text-2xl font-bold text-ink sm:text-3xl">إتمام الطلب</h1>
      <p className="mb-6 text-sm text-soft">أدخل بيانات التوصيل وسنتصل بك هاتفياً للتأكيد.</p>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* form */}
        <form onSubmit={submit} noValidate className="space-y-4 lg:col-span-2">
          <Card className="border-line/60 p-5">
            <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-ink">
              <IconHeadset width={18} height={18} className="text-brand" /> بيانات التوصيل
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {field('الاسم الكامل *', 'name', 'مثال: محمد الأحمدي', 'text', 100, {
                autoComplete: 'name',
                required: true,
              })}
              {field('رقم الهاتف *', 'phone', 'مثال: 0612345678', 'tel', 20, {
                autoComplete: 'tel',
                inputMode: 'tel',
                required: true,
              })}
              {field('المدينة', 'city', 'مثال: الدار البيضاء', 'text', 100, {
                autoComplete: 'address-level2',
              })}
              <div className="sm:col-span-2">
                {field('العنوان التفصيلي *', 'address', 'الحي، الشارع، رقم المنزل…', 'text', 500, {
                  autoComplete: 'street-address',
                  required: true,
                })}
              </div>
              <div className="sm:col-span-2">
                {field('ملاحظات (اختياري)', 'notes', 'أي تفاصيل إضافية لمساعدتنا', 'text', 1000)}
              </div>
            </div>
          </Card>

          <Card className="border-line/60 bg-brand-pale p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-brand-dark">
              <IconCash width={18} height={18} /> الدفع عند الاستلام
            </h2>
            <p className="mt-1.5 text-xs leading-5 text-brand-dark/80">
              لا حاجة لأي بطاقة بنكية. ادفع نقداً عند استلام كتابك من موصل الطلبات.
            </p>
          </Card>

          <Button type="submit" disabled={submitting} className="w-full py-4 text-base">
            {submitting ? 'جارٍ إرسال الطلب…' : `تأكيد الطلب — ${formatPrice(total)}`}
          </Button>
        </form>

        {/* summary */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="border-line/60 bg-white p-5">
            <h2 className="text-base font-bold text-ink">طلبك (<bdi dir="ltr">{count}</bdi>)</h2>
            <ul className="mt-3 space-y-2.5 border-b border-line pb-4">
              {items.map((it) => {
                const stock = it.stock ?? CART_MAX_QTY;
                const clamped = stock < it.qty;
                return (
                  <li key={it.id} className="flex items-center gap-3 text-sm">
                    <BookCover
                      src={it.cover}
                      alt={it.title}
                      className="h-12 w-9 rounded-sm border border-line"
                      imgClassName="h-full w-full rounded-sm object-cover"
                    />
                    <span dir="auto" className="flex-1 line-clamp-1 font-medium text-ink">{it.title}</span>
                    <span className="shrink-0 text-xs text-soft"><bdi dir="ltr">×{it.qty}</bdi></span>
                    {clamped && (
                      <span className="shrink-0 text-xs text-danger bg-rose-50 px-2 py-0.5 rounded-sm">
                        تم تقليص الكمية إلى المخزون (<bdi dir="ltr">{stock}</bdi>)
                      </span>
                    )}
                    <span className="shrink-0 font-semibold text-brand">
                      {formatPrice(it.price * it.qty)}
                    </span>
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
          </Card>

          <Card className="mt-4 border-line/60 bg-gray-50 p-4 text-center text-sm text-soft">
            تفضّل الطلب مباشرة؟{' '}
            <a
              href={checkoutOrderLink(
                {
                  items,
                  total,
                  name: form.name,
                  phone: form.phone,
                  address: form.address,
                },
                whatsapp
              )}
              target="_blank"
              rel="noreferrer noopener"
              className="font-semibold text-brand hover:text-brand-dark"
            >
              تواصل عبر واتساب
            </a>
          </Card>
        </aside>
      </div>
    </div>
  );
}
