import { useEffect, useState } from 'react';
import { adminGetBooks } from '../../lib/admin';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BadgePercent, BookOpenCheck, Copy, Layers3, Pause, Play, Ticket, WandSparkles } from 'lucide-react';

const emptyBundle = { name_ar: '', bundle_price: '', cover_image: '', description_ar: '', bookIds: [] };
const emptyCoupon = { code: '', discount_type: 'percent', discount_value: '', minimum_subtotal: '', max_discount: '', max_uses: '', max_uses_per_phone: '' };

function randomCode() {
  return `KOUTOBI-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export default function OffersAdmin() {
  const { show } = useToast();
  const [books, setBooks] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [bundle, setBundle] = useState(emptyBundle);
  const [coupon, setCoupon] = useState(emptyCoupon);
  const [saving, setSaving] = useState(false);
  const selectedBooks = books.filter((book) => bundle.bookIds.includes(book.id));

  const load = async () => {
    const [bookRows, bundleRows, couponRows] = await Promise.all([
      adminGetBooks(),
      supabase.from('bundle_offers').select('*, bundle_offer_books(book_id)').order('created_at', { ascending: false }),
      supabase.from('coupons').select('*, coupon_redemptions(count)').order('created_at', { ascending: false }),
    ]);
    setBooks(bookRows);
    setBundles(bundleRows.data || []);
    setCoupons(couponRows.data || []);
  };
  useEffect(() => { load().catch(() => {}); }, []);

  const saveBundle = async (event) => {
    event.preventDefault();
    if (bundle.bookIds.length < 2 || !bundle.name_ar.trim() || Number(bundle.bundle_price) <= 0) return show('اختر كتابين على الأقل وأدخل سعراً صحيحاً', 'error');
    setSaving(true);
    try {
      const { data, error } = await supabase.from('bundle_offers').insert({ name_ar: bundle.name_ar.trim(), bundle_price: Number(bundle.bundle_price), cover_image: bundle.cover_image.trim() || null, description_ar: bundle.description_ar.trim() || null }).select().single();
      if (error) throw error;
      const { error: itemsError } = await supabase.from('bundle_offer_books').insert(bundle.bookIds.map((book_id) => ({ offer_id: data.id, book_id })));
      if (itemsError) throw itemsError;
      setBundle(emptyBundle); await load(); show('تم إنشاء العرض');
    } catch (error) { show(error.message, 'error'); } finally { setSaving(false); }
  };

  const saveCoupon = async (event) => {
    event.preventDefault();
    const code = coupon.code.trim().toUpperCase();
    if (!/^[A-Z0-9-]{3,32}$/.test(code) || Number(coupon.discount_value) <= 0) return show('تحقق من رمز الكوبون وقيمته', 'error');
    setSaving(true);
    try {
      const payload = { ...coupon, code, discount_value: Number(coupon.discount_value), minimum_subtotal: Number(coupon.minimum_subtotal || 0), max_discount: coupon.max_discount ? Number(coupon.max_discount) : null, max_uses: coupon.max_uses ? Number(coupon.max_uses) : null, max_uses_per_phone: coupon.max_uses_per_phone ? Number(coupon.max_uses_per_phone) : null };
      const { error } = await supabase.from('coupons').insert(payload);
      if (error) throw error;
      setCoupon(emptyCoupon); await load(); show('تم إنشاء الكوبون');
    } catch (error) { show(error.message, 'error'); } finally { setSaving(false); }
  };

  const toggle = async (table, row) => {
    const { error } = await supabase.from(table).update({ is_active: !row.is_active }).eq('id', row.id);
    if (error) show(error.message, 'error'); else { await load(); show(row.is_active ? 'تم إيقاف العرض' : 'تم تفعيل العرض'); }
  };

  return <div className="space-y-8 pb-10">
    <PageHeader title="العروض والخصومات" description="صمّم حوافز واضحة للقراء، واضبط حدود استخدامها من مكان واحد." crumbs={[{ label: 'لوحة التحكم', to: '/admin/dashboard' }, { label: 'العروض والخصومات' }]} />

    <section className="overflow-hidden rounded-2xl border border-sky-200 bg-sky-50/70 shadow-sm dark:border-sky-900/60 dark:bg-sky-950/20">
      <div className="grid gap-5 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8">
        <div className="max-w-2xl">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-sky-800 dark:text-sky-300"><BadgePercent className="size-4" />مساحة إدارة العروض</div>
          <h2 className="text-2xl font-bold tracking-tight text-ink">كل خصم له قاعدة واضحة</h2>
          <p className="mt-2 leading-7 text-soft">الباقة تخفض سعر مجموعة كتب محددة. أما الكوبون فيمنح خصماً مضبوطاً للطلب، من دون تعديل أسعار الكتب نفسها.</p>
        </div>
        <div className="flex gap-3 md:text-left" dir="ltr">
          <div className="rounded-xl border border-sky-200 bg-white px-5 py-3 text-center dark:border-sky-900 dark:bg-background"><strong className="block text-2xl text-ink">{bundles.filter((row) => row.is_active).length}</strong><span className="text-xs text-soft">باقات نشطة</span></div>
          <div className="rounded-xl border border-sky-200 bg-white px-5 py-3 text-center dark:border-sky-900 dark:bg-background"><strong className="block text-2xl text-ink">{coupons.filter((row) => row.is_active).length}</strong><span className="text-xs text-soft">كوبونات نشطة</span></div>
        </div>
      </div>
    </section>

    <div className="grid items-start gap-8 xl:grid-cols-12">
      <form onSubmit={saveBundle} className="card border border-line p-0 xl:col-span-5">
        <div className="border-b border-line bg-muted/30 px-6 py-5"><div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"><Layers3 className="size-5" /></span><div><h2 className="font-bold text-ink">عرض باقة</h2><p className="mt-1 text-sm text-soft">اختر كتابين أو أكثر وحدّد السعر للمجموعة كاملة.</p></div></div></div>
        <div className="space-y-6 p-6">
          <div className="grid gap-5 sm:grid-cols-[1fr_9rem]"><div className="space-y-2"><Label htmlFor="bundle-name">اسم العرض</Label><Input id="bundle-name" value={bundle.name_ar} onChange={(e) => setBundle({ ...bundle, name_ar: e.target.value })} placeholder="مثل: باقة طالب العلم" /></div><div className="space-y-2"><Label htmlFor="bundle-price">السعر (درهم)</Label><Input id="bundle-price" type="number" min="1" value={bundle.bundle_price} onChange={(e) => setBundle({ ...bundle, bundle_price: e.target.value })} /></div></div><div className="space-y-2"><Label htmlFor="bundle-cover">رابط صورة الغلاف</Label><Input id="bundle-cover" dir="ltr" value={bundle.cover_image} onChange={(e) => setBundle({ ...bundle, cover_image: e.target.value })} placeholder="https://..." /></div><div className="space-y-2"><Label htmlFor="bundle-description">وصف الباقة</Label><Textarea id="bundle-description" value={bundle.description_ar} onChange={(e) => setBundle({ ...bundle, description_ar: e.target.value })} placeholder="عرّف القارئ بمحتوى الباقة وفائدتها." /></div>
          <div><div className="mb-3 flex items-center justify-between"><div><Label>كتب الباقة</Label><p className="mt-1 text-xs text-soft">اختر الكتب التي تكوّن نسخة واحدة من العرض.</p></div><span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-ink">{selectedBooks.length} مختارة</span></div>
            <div className="max-h-80 divide-y divide-line overflow-y-auto rounded-xl border border-line bg-background">{books.map((book) => { const selected = bundle.bookIds.includes(book.id); return <label key={book.id} className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 ${selected ? 'bg-amber-50/70 dark:bg-amber-950/20' : ''}`}><input className="size-4 accent-amber-600" type="checkbox" checked={selected} onChange={() => setBundle({ ...bundle, bookIds: selected ? bundle.bookIds.filter((id) => id !== book.id) : [...bundle.bookIds, book.id] })} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-ink">{book.title_ar}</span>{book.author_ar && <span className="block truncate text-xs text-soft">{book.author_ar}</span>}</span>{book.price != null && <span className="text-xs font-semibold text-soft">{book.price} د.م</span>}</label>; })}</div>
          </div>
          <Button className="w-full" disabled={saving}><BookOpenCheck className="size-4" />إنشاء الباقة</Button>
        </div>
      </form>

      <form onSubmit={saveCoupon} className="card border border-line p-0 xl:col-span-7">
        <div className="border-b border-line bg-muted/30 px-6 py-5"><div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300"><Ticket className="size-5" /></span><div><h2 className="font-bold text-ink">كوبون خصم</h2><p className="mt-1 text-sm text-soft">اضبط قيمة الخصم وشروط استخدام الرمز قبل نشره للعملاء.</p></div></div></div>
        <div className="space-y-7 p-6">
          <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-900 dark:bg-violet-950/20"><Label htmlFor="coupon-code">رمز الكوبون</Label><div className="mt-2 flex flex-col gap-2 sm:flex-row"><Input id="coupon-code" className="font-mono tracking-wider" dir="ltr" value={coupon.code} onChange={(e) => setCoupon({ ...coupon, code: e.target.value.toUpperCase() })} placeholder="KOUTOBI-10" /><Button type="button" variant="outline" className="shrink-0" onClick={() => setCoupon({ ...coupon, code: randomCode() })}><WandSparkles className="size-4" />توليد رمز</Button></div><p className="mt-2 text-xs text-soft">استخدم أحرفاً إنجليزية كبيرة وأرقاماً وشرطة فقط.</p></div>
          <div><h3 className="mb-4 text-sm font-bold text-ink">قيمة الخصم</h3><div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label>نوع الخصم</Label><Select value={coupon.discount_type} onValueChange={(discount_type) => setCoupon({ ...coupon, discount_type })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="percent">نسبة مئوية</SelectItem><SelectItem value="fixed">مبلغ ثابت</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>قيمة الخصم {coupon.discount_type === 'percent' ? '(%)' : '(درهم)'}</Label><Input type="number" min="1" value={coupon.discount_value} onChange={(e) => setCoupon({ ...coupon, discount_value: e.target.value })} /></div><div className="space-y-2"><Label>الحد الأدنى للطلب (درهم)</Label><Input type="number" min="0" value={coupon.minimum_subtotal} onChange={(e) => setCoupon({ ...coupon, minimum_subtotal: e.target.value })} /></div><div className="space-y-2"><Label>سقف الخصم (درهم)</Label><Input type="number" min="1" value={coupon.max_discount} onChange={(e) => setCoupon({ ...coupon, max_discount: e.target.value })} placeholder="اختياري" /></div></div></div>
          <div className="border-t border-line pt-6"><h3 className="mb-1 text-sm font-bold text-ink">حدود الاستخدام</h3><p className="mb-4 text-xs text-soft">اترك الحقول فارغة إذا لم ترد وضع حد.</p><div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label>إجمالي مرات الاستخدام</Label><Input type="number" min="1" value={coupon.max_uses} onChange={(e) => setCoupon({ ...coupon, max_uses: e.target.value })} placeholder="بلا حد" /></div><div className="space-y-2"><Label>الحد لكل رقم هاتف</Label><Input type="number" min="1" value={coupon.max_uses_per_phone} onChange={(e) => setCoupon({ ...coupon, max_uses_per_phone: e.target.value })} placeholder="بلا حد" /></div></div></div>
          <Button className="w-full" disabled={saving}><Ticket className="size-4" />إنشاء الكوبون</Button>
        </div>
      </form>
    </div>

    <section className="space-y-5"><div className="flex items-end justify-between gap-4"><div><h2 className="text-xl font-bold text-ink">العروض المنشورة</h2><p className="mt-1 text-sm text-soft">أوقف أي عرض مؤقتاً من دون حذفه.</p></div></div>
      <div className="grid gap-5 lg:grid-cols-2"><section className="card border border-line p-0"><div className="flex items-center justify-between border-b border-line px-6 py-4"><div className="flex items-center gap-2 font-bold text-ink"><Layers3 className="size-4 text-amber-700" />الباقات</div><span className="text-sm text-soft">{bundles.length}</span></div><div className="divide-y divide-line">{bundles.length ? bundles.map((row) => <div key={row.id} className="flex items-center gap-4 px-6 py-4"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/30"><BookOpenCheck className="size-4" /></span><div className="min-w-0 flex-1"><p className="truncate font-bold text-ink">{row.name_ar}</p><p className="mt-1 text-sm text-soft">{row.bundle_price} درهم للباقة</p></div><Button size="sm" variant="outline" onClick={() => toggle('bundle_offers', row)}>{row.is_active ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}{row.is_active ? 'إيقاف' : 'تفعيل'}</Button></div>) : <p className="px-6 py-10 text-center text-sm text-soft">لم تُنشأ أي باقة بعد.</p>}</div></section>
        <section className="card border border-line p-0"><div className="flex items-center justify-between border-b border-line px-6 py-4"><div className="flex items-center gap-2 font-bold text-ink"><Ticket className="size-4 text-violet-700" />الكوبونات</div><span className="text-sm text-soft">{coupons.length}</span></div><div className="divide-y divide-line">{coupons.length ? coupons.map((row) => {
          const uses = row.coupon_redemptions?.[0]?.count || 0;
          return <div key={row.id} className="px-6 py-5"><div className="flex items-start gap-4"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-950/30"><Copy className="size-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-mono text-sm font-bold tracking-wider text-ink" dir="ltr">{row.code}</p><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${row.is_active ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-muted text-soft'}`}>{row.is_active ? 'نشط' : 'متوقف'}</span></div><p className="mt-1 text-sm text-soft">خصم {row.discount_value}{row.discount_type === 'percent' ? '%' : ' درهم'}</p></div><Button size="sm" variant="outline" onClick={() => toggle('coupons', row)}>{row.is_active ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}{row.is_active ? 'إيقاف' : 'تفعيل'}</Button></div><div className="mt-4 grid gap-2 text-xs sm:grid-cols-2"><div className="rounded-lg bg-muted/60 px-3 py-2 text-soft"><strong className="text-ink">الحد الأدنى:</strong> {row.minimum_subtotal ? `${row.minimum_subtotal} درهم` : 'لا يوجد'}</div><div className="rounded-lg bg-muted/60 px-3 py-2 text-soft"><strong className="text-ink">سقف الخصم:</strong> {row.max_discount ? `${row.max_discount} درهم` : 'لا يوجد'}</div><div className="rounded-lg bg-muted/60 px-3 py-2 text-soft"><strong className="text-ink">الاستخدام:</strong> {uses}{row.max_uses ? ` من ${row.max_uses}` : ' بلا حد'}</div><div className="rounded-lg bg-muted/60 px-3 py-2 text-soft"><strong className="text-ink">لكل هاتف:</strong> {row.max_uses_per_phone || 'بلا حد'}</div></div></div>;
        }) : <p className="px-6 py-10 text-center text-sm text-soft">لم يُنشأ أي كوبون بعد.</p>}</div></section></div>
    </section>
  </div>;
}
