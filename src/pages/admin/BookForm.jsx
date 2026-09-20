import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  adminCreateBook,
  adminCreateBookImage,
  adminDecrementStock,
  adminDeleteBookImage,
  adminGetBookImages,
  adminGetBooks,
  adminUpdateBook,
  adminUpdateBookImage,
  deleteR2Object,
  getAppSetting,
  getAttributeOptionsForForm,
  getCategoriesForForm,
  uploadR2File,
} from '../../lib/admin';
import { CATEGORIES, R2_PUBLIC_URL, UPLOAD_ENDPOINT } from '../../lib/config';
import {
  blobToBase64,
  IMAGE_MAX_COUNT,
  resizeImageToLimit,
} from '../../lib/images';
import { useToast } from '../../components/Toast';
import { IconBook, IconCheck, IconStar, IconTrash } from '../../components/icons';

const EMPTY = {
  title_ar: '',
  subtitle_ar: '',
  author_ar: '',
  publisher_ar: '',
  category: '',
  price: '',
  old_price: '',
  description_ar: '',
  pages: '',
  size_ar: '',
  binding_ar: '',
  paper_ar: '',
  edition_ar: '',
  isbn: '',
  cover_image: '',
  stock_qty: '',
  show_quantity: 'inherit',
  is_new: true,
  is_featured: false,
  is_out_of_stock: false,
  is_active: true,
};

const FALLBACK_CATS = CATEGORIES.map((c) => c.name);
const FALLBACK_PAPER = ['ورق أصفر (شامواه)', 'ورق أبيض'];
const FALLBACK_BINDING = ['تجليد فني', 'تجليد عادي'];
const FALLBACK_SIZES = ['17×24 سم', '14×20 سم', '12×17 سم', '24×17 سم'];

let uidCounter = 0;
const nextUid = () => `img-${Date.now()}-${uidCounter++}`;

export default function BookForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { session } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [form, setForm] = useState(EMPTY);
  // Gallery working set: { uid, id?, url, r2_key?, blob?, ext?, preview?, is_primary }
  // - `blob` set → staged locally, uploaded to R2 on save (never orphaned).
  // - `id` set → already persisted in book_images.
  const [images, setImages] = useState([]);
  const [originalImages, setOriginalImages] = useState([]);
  const [urlInput, setUrlInput] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(isEdit);
  const [staging, setStaging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cats, setCats] = useState([]);
  const [paperOpts, setPaperOpts] = useState([]);
  const [bindingOpts, setBindingOpts] = useState([]);
  const [sizeOpts, setSizeOpts] = useState([]);

  // Revoke local preview URLs on unmount.
  const imagesRef = useRef(images);
  imagesRef.current = images;
  useEffect(
    () => () => {
      imagesRef.current.forEach((i) => {
        if (i.preview) URL.revokeObjectURL(i.preview);
      });
    },
    []
  );

  useEffect(() => {
    // Fetch dropdown options (public reads — no admin check needed)
    Promise.all([
      getCategoriesForForm(),
      getAttributeOptionsForForm('paper'),
      getAttributeOptionsForForm('binding'),
      getAttributeOptionsForForm('size'),
    ])
      .then(([c, p, b, s]) => {
        setCats(c.length ? c : FALLBACK_CATS);
        setPaperOpts(p.length ? p : FALLBACK_PAPER);
        setBindingOpts(b.length ? b : FALLBACK_BINDING);
        setSizeOpts(s.length ? s : FALLBACK_SIZES);
      })
      .catch(() => {
        setCats(FALLBACK_CATS);
        setPaperOpts(FALLBACK_PAPER);
        setBindingOpts(FALLBACK_BINDING);
        setSizeOpts(FALLBACK_SIZES);
      });

    if (!isEdit) {
      setForm({ ...EMPTY, cover_image: '' });
      return;
    }
    Promise.all([adminGetBooks(), adminGetBookImages(id)])
      .then(([list, imgs]) => {
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
        const rows = (imgs || []).map((r) => ({
          uid: nextUid(),
          id: r.id,
          url: r.url,
          r2_key: r.r2_key || null,
          is_primary: !!r.is_primary,
        }));
        if (rows.length && !rows.some((r) => r.is_primary)) rows[0].is_primary = true;
        setImages(rows);
        setOriginalImages(rows.map((r) => ({ ...r })));
      })
      .catch((e) => show(e.message, 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const markPrimary = (uid) =>
    setImages((prev) => prev.map((i) => ({ ...i, is_primary: i.uid === uid })));

  const moveImage = (uid, dir) =>
    setImages((prev) => {
      const ix = prev.findIndex((i) => i.uid === uid);
      const jx = ix + dir;
      if (ix < 0 || jx < 0 || jx >= prev.length) return prev;
      const next = [...prev];
      [next[ix], next[jx]] = [next[jx], next[ix]];
      return next;
    });

  const removeImage = (uid) =>
    setImages((prev) => {
      const target = prev.find((i) => i.uid === uid);
      if (target?.preview) URL.revokeObjectURL(target.preview);
      const next = prev.filter((i) => i.uid !== uid);
      if (target?.is_primary && next.length) next[0] = { ...next[0], is_primary: true };
      return next;
    });

  const copyUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      show('تم نسخ الرابط ✓');
    } catch {
      show('تعذّر النسخ — انسخ الرابط يدوياً', 'error');
    }
  };

  /** Resize selected files in the browser and stage them (upload happens on save). */
  const stageFiles = async (fileList) => {
    const files = [...(fileList || [])].filter((f) => f.type?.startsWith('image/'));
    if (!files.length) return;
    if (images.length + files.length > IMAGE_MAX_COUNT) {
      show(`الحد الأقصى ${IMAGE_MAX_COUNT} صور لكل كتاب`, 'error');
      return;
    }
    setStaging(true);
    try {
      const staged = [];
      for (const f of files) {
        const { blob, ext } = await resizeImageToLimit(f);
        staged.push({
          uid: nextUid(),
          blob,
          ext,
          url: '',
          r2_key: null,
          preview: URL.createObjectURL(blob),
          is_primary: false,
        });
      }
      setImages((prev) => {
        const next = [...prev, ...staged];
        if (!prev.some((i) => i.is_primary) && next.length) {
          next[prev.length] = { ...next[prev.length], is_primary: true };
        }
        return next;
      });
      show(`تم تجهيز ${staged.length} صورة — ستُرفع عند الحفظ`);
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setStaging(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const addUrlImage = () => {
    const url = urlInput.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      show('الرابط يجب أن يبدأ بـ http(s)://', 'error');
      return;
    }
    if (images.length >= IMAGE_MAX_COUNT) {
      show(`الحد الأقصى ${IMAGE_MAX_COUNT} صور لكل كتاب`, 'error');
      return;
    }
    setImages((prev) => [
      ...prev,
      {
        uid: nextUid(),
        url,
        r2_key: null,
        is_primary: prev.length === 0 || !prev.some((i) => i.is_primary),
      },
    ]);
    setUrlInput('');
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

    setSaving(true);
    // R2 keys uploaded during THIS save — deleted again if the save fails (no orphans).
    const uploadedKeys = [];
    try {
      // 1. Upload staged blobs to R2.
      const finalImages = [];
      let n = 0;
      for (const img of images) {
        if (img.blob) {
          const base64 = await blobToBase64(img.blob);
          const up = await uploadR2File(
            { name: `book-${Date.now()}-${n++}.${img.ext || 'jpg'}`, type: img.blob.type || 'image/jpeg', base64 },
            session?.access_token
          );
          uploadedKeys.push(up.key);
          if (img.preview) URL.revokeObjectURL(img.preview);
          finalImages.push({ ...img, url: up.url, r2_key: up.key, blob: undefined, preview: undefined });
        } else {
          finalImages.push(img);
        }
      }
      if (finalImages.length && !finalImages.some((i) => i.is_primary)) {
        finalImages[0] = { ...finalImages[0], is_primary: true };
      }
      const primary = finalImages.find((i) => i.is_primary) || null;

      // 2. Save the book (primary URL mirrored into legacy cover_image).
      const payload = {
        ...form,
        price,
        old_price: form.old_price === '' ? null : Number(form.old_price),
        pages: form.pages === '' ? null : Number(form.pages),
        stock_qty: form.stock_qty === '' ? 0 : Number(form.stock_qty),
        show_quantity: form.show_quantity,
        cover_image: primary?.url || '',
        is_new: !!form.is_new,
        is_featured: !!form.is_featured,
        is_out_of_stock: !!form.is_out_of_stock,
        is_active: !!form.is_active,
      };

      let bookId = id;
      if (isEdit) {
        await adminUpdateBook(id, payload);
      } else {
        const created = await adminCreateBook(payload);
        bookId = created.id;
      }

      // 3. Sync gallery rows.
      if (isEdit) {
        const currIds = new Set(finalImages.filter((i) => i.id).map((i) => i.id));
        const r2Failures = [];
        for (const orig of originalImages) {
          if (!orig.id || currIds.has(orig.id)) continue;
          await adminDeleteBookImage(orig.id);
          if (orig.r2_key) {
            try {
              await deleteR2Object(orig.r2_key, session?.access_token);
            } catch {
              r2Failures.push(orig.r2_key);
            }
          }
        }
        let pos = 0;
        for (const img of finalImages) {
          if (!img.id) {
            await adminCreateBookImage({
              book_id: bookId,
              url: img.url,
              r2_key: img.r2_key,
              position: pos,
              is_primary: !!img.is_primary,
            });
          } else {
            await adminUpdateBookImage(img.id, { position: pos, is_primary: !!img.is_primary });
          }
          pos += 1;
        }
        if (r2Failures.length) {
          show(`تم الحفظ، لكن تعذّر حذف ${r2Failures.length} صورة قديمة من التخزين`, 'error');
        }
      } else {
        let pos = 0;
        for (const img of finalImages) {
          await adminCreateBookImage({
            book_id: bookId,
            url: img.url,
            r2_key: img.r2_key,
            position: pos,
            is_primary: !!img.is_primary,
          });
          pos += 1;
        }
      }

      show(isEdit ? 'تم حفظ التعديلات ✓' : 'تمت إضافة الكتاب ✓');
      navigate('/admin/books');
    } catch (err) {
      for (const key of uploadedKeys) {
        try {
          await deleteR2Object(key, session?.access_token);
        } catch {
          /* orphan-sweep procedure covers leftovers */
        }
      }
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
                {cats.map((c) => (
                  <option key={c} value={c}>{c}</option>
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
                {paperOpts.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="binding_ar" className="mb-1.5 block text-sm font-medium text-ink">التجليد</label>
              <select id="binding_ar" value={form.binding_ar} onChange={set('binding_ar')} className="input">
                {bindingOpts.map((b) => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="size_ar" className="mb-1.5 block text-sm font-medium text-ink">المقاس</label>
              <select id="size_ar" value={form.size_ar} onChange={set('size_ar')} className="input">
                {sizeOpts.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="stock_qty" className="mb-1.5 block text-sm font-medium text-ink">المخزون (عدد النسخ)</label>
              <input
                id="stock_qty"
                type="number"
                min="0"
                value={form.stock_qty}
                onChange={set('stock_qty')}
                placeholder="مثال: 50"
                className="input"
              />
            </div>
            <div>
              <label htmlFor="show_quantity" className="mb-1.5 block text-sm font-medium text-ink">إظهار الكمية في المتجر</label>
              <select id="show_quantity" value={form.show_quantity} onChange={set('show_quantity')} className="input">
                <option value="inherit">وراثة الإعداد العام</option>
                <option value="show">إظهار الكمية الدقيقة</option>
                <option value="hide">إخفاء الكمية</option>
              </select>
            </div>
          </div>
        </section>

        {/* قسم الصور */}
        <section className="card border border-line/70 p-5">
          <h2 className="text-base font-bold text-ink">صور الكتاب (حتى {IMAGE_MAX_COUNT})</h2>
          <p className="mb-4 mt-1 text-xs leading-5 text-soft">
            الصور المختارة من جهازك تُصغَّر تلقائياً في متصفحك إلى أقل من 180 ك.ب ثم تُرفع إلى Cloudflare R2 عند الحفظ.
            الصورة ★ الرئيسية تظهر في بطاقات المتجر.
          </p>

          {images.length > 0 && (
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {images.map((img, ix) => (
                <figure
                  key={img.uid}
                  className={`overflow-hidden rounded-md border bg-white ${img.is_primary ? 'border-brand ring-1 ring-brand' : 'border-line'}`}
                >
                  <div className="relative">
                    {img.preview || img.url ? (
                      <img src={img.preview || img.url} alt={`صورة ${ix + 1}`} className="aspect-square w-full object-cover" />
                    ) : (
                      <div className="flex aspect-square w-full items-center justify-center bg-gray-50 text-gray-300">
                        <IconBook width={24} height={24} />
                      </div>
                    )}
                    {img.is_primary && (
                      <span className="absolute right-1.5 top-1.5 rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
                        ★ الرئيسية
                      </span>
                    )}
                    {img.blob && (
                      <span className="absolute left-1.5 top-1.5 rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-brand-dark">
                        ستُرفع عند الحفظ
                      </span>
                    )}
                  </div>
                  <figcaption className="space-y-1.5 p-2">
                    {img.url ? (
                      <button
                        type="button"
                        onClick={() => copyUrl(img.url)}
                        dir="ltr"
                        title="اضغط لنسخ الرابط"
                        className="block w-full truncate text-left text-[10px] text-soft underline decoration-dotted hover:text-brand"
                      >
                        📋 {img.url}
                      </button>
                    ) : (
                      <span className="block text-[10px] text-soft">معاينة محلية — لم تُرفع بعد</span>
                    )}
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => markPrimary(img.uid)}
                        disabled={img.is_primary}
                        title="اجعلها الصورة الرئيسية"
                        className={`rounded p-1.5 transition ${img.is_primary ? 'text-brand' : 'text-gray-300 hover:bg-amber-50 hover:text-amber-500'}`}
                        aria-label="صورة رئيسية"
                      >
                        <IconStar filled={img.is_primary} width={16} height={16} />
                      </button>
                      <div className="flex items-center gap-0.5" dir="ltr">
                        <button type="button" onClick={() => moveImage(img.uid, -1)} disabled={ix === 0} className="rounded p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-ink disabled:opacity-30" aria-label="تقديم">‹</button>
                        <button type="button" onClick={() => moveImage(img.uid, 1)} disabled={ix === images.length - 1} className="rounded p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-ink disabled:opacity-30" aria-label="تأخير">›</button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(img.uid)}
                        title="حذف الصورة"
                        className="rounded p-1.5 text-gray-300 transition hover:bg-rose-50 hover:text-danger"
                        aria-label="حذف الصورة"
                      >
                        <IconTrash width={16} height={16} />
                      </button>
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={staging || saving || images.length >= IMAGE_MAX_COUNT}
              className="btn-primary w-full"
            >
              {staging ? 'جارٍ التجهيز…' : images.length >= IMAGE_MAX_COUNT ? `اكتمل العدد (${IMAGE_MAX_COUNT})` : 'اختار صوراً من جهازك'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => stageFiles(e.target.files)}
              className="hidden"
            />
            <div className="flex gap-2">
              <input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                dir="ltr"
                placeholder="https://…/cover.jpg"
                className="input flex-1 !text-right"
                aria-label="رابط صورة"
              />
              <button
                type="button"
                onClick={addUrlImage}
                disabled={saving || images.length >= IMAGE_MAX_COUNT}
                className="btn-ghost shrink-0"
              >
                <IconCheck width={16} height={16} /> إضافة بالرابط
              </button>
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
          <button type="submit" disabled={saving || staging} className="btn-primary !px-8">
            {saving ? 'جارٍ الحفظ…' : isEdit ? 'حفظ التعديلات' : 'نشر الكتاب'}
          </button>
        </div>
      </form>
    </div>
  );
}
