import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminCreateBook, adminGetBooks, adminUpdateBook } from '../../lib/admin';
import { CATEGORIES, R2_PUBLIC_URL, UPLOAD_ENDPOINT } from '../../lib/config';
import { useToast } from '../../components/Toast';
import { IconBook } from '../../components/icons';

const MAX_KB = 300;
const MAX_BYTES = 6 * 1024 * 1024;

const PAPER = ['ورق أصفر (شامواه)', 'ورق أبيض'];
const BINDING = ['تجليد فني', 'تجليد عادي'];
const SIZES = ['17×24 سم', '14×20 سم', '12×17 سم', '24×17 سم'];

const EMPTY = {
  title_ar: '',
  subtitle_ar: '',
  author_ar: '',
  publisher_ar: '',
  category: CATEGORIES[0].name,
  price: '',
  old_price: '',
  description_ar: '',
  pages: '',
  size_ar: SIZES[0],
  binding_ar: BINDING[0],
  paper_ar: PAPER[0],
  edition_ar: '',
  isbn: '',
  cover_image: '',
  is_new: true,
  is_featured: false,
  is_out_of_stock: false,
  is_active: true,
};

export default function BookForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { session } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(isEdit);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) {
      setForm({ ...EMPTY, cover_image: '' });
      return;
    }
    adminGetBooks()
      .then((list) => {
        const b = list.find((x) => x.id === id);
        if (!b) {
          show('الكتاب غير موجود', 'error');
          navigate('/admin/books');
          return;
        }
        setForm({
          ...EMPTY,
          ...b,
          price: b.price ?? '',
          old_price: b.old_price ?? '',
          pages: b.pages ?? '',
        });
      })
      .catch((e) => show(e.message, 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const uploadCover = async (file) => {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      show('الصورة أكبر من 6 ميغابايت — اختر صورة أصغر', 'error');
      return;
    }
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      const base64 = await new Promise((res, rej) => {
        reader.onload = () => res(reader.result);
        reader.onerror = rej;
      });
      const [meta, data] = base64.split(',');
      const contentType = meta.match(/data:(.*?);/)?.[1] || 'image/png';
      const body = { image: data, contentType, fileSizeBytes: file.size };

      const res = await fetch(UPLOAD_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `فشل الرفع (${res.status})`);

      const url = json.key ? `${R2_PUBLIC_URL}/${json.key}` : json.url;
      setForm((f) => ({ ...f, cover_image: url }));
      show('تم رفع الصورة بنجاح ✓');
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const save = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.title_ar.trim()) errs.title_ar = 'عنوان الكتاب مطلوب';
    const price = Number(form.price);
    if (form.price === '' || Number.isNaN(price) || price < 0) errs.price = 'أدخل سعراً صحيحاً';
    if (form.old_price && (Number.isNaN(Number(form.old_price)) || Number(form.old_price) <= price)) errs.old_price = 'السعر القديم يجب أن يكون أكبر من السعر الحالي';
    setErrors(errs);
    if (Object.keys(errs).length) {
      show('تحقق من الحقول الناقصة', 'error');
      return;
    }

    const payload = {
      ...form,
      price,
      old_price: form.old_price === '' ? null : Number(form.old_price),
      pages: form.pages === '' ? null : Number(form.pages),
      is_new: !!form.is_new,
      is_featured: !!form.is_featured,
      is_out_of_stock: !!form.is_out_of_stock,
      is_active: !!form.is_active,
    };

    setSaving(true);
    try {
      if (isEdit) await adminUpdateBook(id, payload);
      else await adminCreateBook(payload);
      show(isEdit ? 'تم حفظ التعديلات ✓' : 'تمت إضافة الكتاب ✓');
      navigate('/admin/books');
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggle = (k) => () => setForm((f) => ({ ...f, [k]: !f[k] }));
  const check = (k, label) => (
    <label className={`flex flex-1 cursor-pointer items-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium transition ${form[k] ? 'border-brand bg-brand-light text-brand' : 'border-line bg-white text-soft'}`}>
      <input type="checkbox" checked={form[k]} onChange={toggle(k)} className="sr-only" />
      <span className={`h-3 w-3 rounded-sm border ${form[k] ? 'border-brand bg-brand' : 'border-gray-300 bg-white'}`} />
      {label}
    </label>
  );

  const field = (label, name, extra = {}) => (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-ink">{label}</label>
      <input
        id={name}
        value={form[name]}
        onChange={set(name)}
        className="input"
        {...extra}
      />
      {errors[name] && <p className="mt-1 text-xs font-medium text-danger">{errors[name]}</p>}
    </div>
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
        <p className="mt-3 text-sm text-soft">جارٍ تحميل الكتاب…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-ink">{isEdit ? 'تعديل الكتاب ✏️' : 'إضافة كتاب جديد 📚'}</h1>
      <p className="mt-1 text-sm text-soft">املأ بيانات الكتاب وارفعه ليكون جاهزاً للبيع.</p>

      <form onSubmit={save} className="mt-6 space-y-6" noValidate>
        {/* قسم البيانات */}
        <section className="card border border-line/70 p-5">
          <h2 className="mb-4 text-base font-bold text-ink">معلومات الكتاب</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {field('العنوان *', 'title_ar', { placeholder: 'مثال: الداء والدواء' })}
            {field('العنوان الفرعي', 'subtitle_ar', { placeholder: 'اختياري' })}
            {field('المؤلف', 'author_ar', { placeholder: 'مثال: ابن القيم الجوزية' })}
            {field('الناشر', 'publisher_ar', { placeholder: 'مثال: دار ابن كثير' })}
            <div>
              <label htmlFor="category" className="mb-1.5 block text-sm font-medium text-ink">التصنيف *</label>
              <select id="category" value={form.category} onChange={set('category')} className="input">
                {CATEGORIES.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            {field('السعر (درهم) *', 'price', { type: 'number', min: 0, step: '0.01', placeholder: 'مثال: 80' })}
            {field('السعر قبل الخصم (اختياري)', 'old_price', { type: 'number', min: 0, step: '0.01', placeholder: 'اتركه فارغاً إن لم يوجد خصم' })}
            <div className="sm:col-span-2">
              <label htmlFor="description_ar" className="mb-1.5 block text-sm font-medium text-ink">الوصف</label>
              <textarea
                id="description_ar"
                value={form.description_ar}
                onChange={set('description_ar')}
                rows={4}
                className="input resize-y"
                placeholder="نبذة عن الكتاب ومحتواه…"
              />
            </div>
          </div>
        </section>

        {/* قسم بيانات الطبعة */}
        <section className="card border border-line/70 p-5">
          <h2 className="mb-4 text-base font-bold text-ink">بيانات الطبعة</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {field('عدد الصفحات', 'pages', { type: 'number', min: 0, placeholder: 'مثال: 480' })}
            {field('رقم ISBN', 'isbn', { placeholder: 'مثال: 978-2-7451-...' })}
            {field('الطبعة', 'edition_ar', { placeholder: 'مثال: الطبعة الخامسة' })}
            <div>
              <label htmlFor="paper_ar" className="mb-1.5 block text-sm font-medium text-ink">الورق</label>
              <select id="paper_ar" value={form.paper_ar} onChange={set('paper_ar')} className="input">
                {PAPER.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="binding_ar" className="mb-1.5 block text-sm font-medium text-ink">التجليد</label>
              <select id="binding_ar" value={form.binding_ar} onChange={set('binding_ar')} className="input">
                {BINDING.map((b) => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="size_ar" className="mb-1.5 block text-sm font-medium text-ink">المقاس</label>
              <select id="size_ar" value={form.size_ar} onChange={set('size_ar')} className="input">
                {SIZES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* قسم الغلاف */}
        <section className="card border border-line/70 p-5">
          <h2 className="mb-1 text-base font-bold text-ink">غلاف الكتاب</h2>
          <p className="mb-4 text-xs text-soft">
            ارفع صورة بصيغة JPG أو PNG (أقل من {MAX_KB} ك.ب يُفضَّل) — ستُخزَّن في Cloudflare R2.
          </p>
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              {form.cover_image ? (
                <img src={form.cover_image} alt="الغلاف" className="h-40 w-[113px] rounded-md border border-line object-cover shadow-card" />
              ) : (
                <div className="flex h-40 w-[113px] items-center justify-center rounded-md border border-dashed border-line bg-gray-50 text-gray-300">
                  <IconBook width={24} height={24} />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="btn-primary w-full"
              >
                {uploading ? 'جارٍ الرفع…' : form.cover_image ? 'استبدال الصورة' : 'اختار صورة من جهازك'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={(e) => uploadCover(e.target.files?.[0])}
                className="hidden"
              />
              <div>
                <label htmlFor="cover_image" className="mb-1.5 block text-xs text-soft">أو الصق رابط الصورة مباشرة (URL)</label>
                <input
                  id="cover_image"
                  value={form.cover_image}
                  onChange={set('cover_image')}
                  dir="ltr"
                  placeholder="https://…/cover.jpg"
                  className="input !text-right"
                />
              </div>
            </div>
          </div>
        </section>

        {/* قسم الحالة */}
        <section className="card border border-line/70 p-5">
          <h2 className="mb-4 text-base font-bold text-ink">الحالة والعرض</h2>
          <div className="flex flex-wrap gap-3">
            {check('is_new', 'كتاب جديد')}
            {check('is_featured', '⭐ كتاب مميز')}
            {check('is_out_of_stock', 'نفدت الكمية')}
            {check('is_active', 'منشور في المتجر')}
          </div>
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Link to="/admin/books" className="btn-ghost">إلغاء</Link>
          <button type="submit" disabled={saving} className="btn-primary !px-8">
            {saving ? 'جارٍ الحفظ…' : isEdit ? 'حفظ التعديلات' : 'نشر الكتاب'}
          </button>
        </div>
      </form>
    </div>
  );
}