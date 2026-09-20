import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  adminCreateAttributeOption,
  adminCreateCategory,
  adminDeleteAttributeOption,
  adminDeleteCategory,
  adminGetAttributeOptions,
  adminGetCategories,
  adminUpdateAttributeOption,
  adminUpdateCategory,
} from '../../lib/admin';
import { useToast } from '../../components/Toast';
import { IconClose, IconEdit, IconPlus, IconTrash } from '../../components/icons';

const TYPES = ['binding', 'size', 'paper'];

export default function CatalogData() {
  const { session } = useAuth();
  const { show } = useToast();

  const [cats, setCats] = useState([]);
  const [attrs, setAttrs] = useState({});
  const [catForm, setCatForm] = useState({ name_ar: '', sort: '' });
  const [catEditId, setCatEditId] = useState(null);
  const [catErrors, setCatErrors] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [cList, ...aLists] = await Promise.all([
        adminGetCategories(),
        ...TYPES.map((t) => adminGetAttributeOptions(t)),
      ]);
      setCats(cList);
      const byType = {};
      TYPES.forEach((t, i) => {
        byType[t] = aLists[i];
      });
      setAttrs(byType);
    } catch (e) {
      show(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const catValidate = (name) => {
    const e = {};
    if (!name.trim()) e.name_ar = 'اسم التصنيف مطلوب';
    const dup = cats.some((c) => c.name_ar === name.trim() && c.id !== catEditId);
    if (dup) e.name_ar = 'تصنيف بهذا الاسم موجود بالفعل';
    return e;
  };

  const catSubmit = async (e) => {
    e.preventDefault();
    const errs = catValidate(catForm.name_ar);
    setCatErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      if (catEditId) {
        await adminUpdateCategory(catEditId, { name_ar: catForm.name_ar.trim(), sort: Number(catForm.sort) || 0 });
        show('تم تحديث التصنيف ✓');
      } else {
        await adminCreateCategory({ name_ar: catForm.name_ar.trim(), sort: Number(catForm.sort) || 0 });
        show('تم إضافة التصنيف ✓');
      }
      setCatForm({ name_ar: '', sort: '' });
      setCatEditId(null);
      load();
    } catch (err) {
      show(err.message, 'error');
    }
  };

  const catStartEdit = (c) => {
    setCatForm({ name_ar: c.name_ar, sort: String(c.sort) });
    setCatEditId(c.id);
    setCatErrors({});
  };

  const catDelete = async (c) => {
    if (!window.confirm(`حذف تصنيف «${c.name_ar}»؟ الكتب المرتبطة ستحتفظ بالاسم النصي.`)) return;
    try {
      await adminDeleteCategory(c.id);
      show('تم حذف التصنيف');
      load();
    } catch (err) {
      show(err.message, 'error');
    }
  };

  const attrForm = (type) => {
    const [f, setF] = useState({ value_ar: '', sort: '' });
    const [editId, setEditId] = useState(null);
    const [errs, setErrs] = useState({});

    const validate = (v) => {
      const e = {};
      if (!v.trim()) e.value_ar = 'القيمة مطلوبة';
      const dup = attrs[type]?.some((a) => a.value_ar === v.trim() && a.id !== editId);
      if (dup) e.value_ar = 'هذه القيمة موجودة بالفعل لهذا النوع';
      return e;
    };

    const submit = async (ev) => {
      ev.preventDefault();
      const e = validate(f.value_ar);
      setErrs(e);
      if (Object.keys(e).length) return;
      try {
        if (editId) {
          await adminUpdateAttributeOption(editId, { value_ar: f.value_ar.trim(), sort: Number(f.sort) || 0 });
          show(`تم تحديث ${type} ✓`);
        } else {
          await adminCreateAttributeOption({ type, value_ar: f.value_ar.trim(), sort: Number(f.sort) || 0 });
          show(`تم إضافة ${type} ✓`);
        }
        setF({ value_ar: '', sort: '' });
        setEditId(null);
        load();
      } catch (err) {
        show(err.message, 'error');
      }
    };

    const startEdit = (a) => {
      setF({ value_ar: a.value_ar, sort: String(a.sort) });
      setEditId(a.id);
      setErrs({});
    };

    const remove = async (a) => {
      if (!window.confirm(`حذف «${a.value_ar}» من ${type}؟`)) return;
      try {
        await adminDeleteAttributeOption(a.id);
        show('تم الحذف');
        load();
      } catch (err) {
        show(err.message, 'error');
      }
    };

    return (
      <div className="space-y-4">
        <h4 className="font-semibold text-ink capitalize">{type} (التجليد / المقاس / الورق)</h4>
        <form onSubmit={submit} className="flex gap-2 flex-wrap">
          <input
            value={f.value_ar}
            onChange={(e) => setF({ ...f, value_ar: e.target.value })}
            placeholder={type === 'binding' ? 'مثال: تجليد فني' : type === 'size' ? 'مثال: 17 × 24 سم' : 'مثال: شامواه'}
            className="input flex-1 min-w-[160px]"
          />
          <input
            type="number"
            value={f.sort}
            onChange={(e) => setF({ ...f, sort: e.target.value })}
            placeholder="الترتيب"
            className="input w-20"
            min="0"
          />
          <button type="submit" className="btn-primary shrink-0">
            {editId ? 'حفظ' : <IconPlus width={16} height={16} />}
          </button>
          {editId && (
            <button type="button" onClick={() => { setF({ value_ar: '', sort: '' }); setEditId(null); setErrs({}); }} className="btn-ghost shrink-0">
              إلغاء
            </button>
          )}
          {errs.value_ar && <span className="text-xs text-danger flex-1 w-full basis-full">{errs.value_ar}</span>}
        </form>
        <ul className="divide-y divide-line/60">
          {(attrs[type] || []).map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 py-2">
              <span className="text-sm font-medium text-ink">{a.value_ar}</span>
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-soft">ترتيب: {a.sort}</span>
                <button onClick={() => startEdit(a)} className="rounded p-1.5 text-gray-400 hover:text-brand" title="تعديل"><IconEdit width={14} height={14} /></button>
                <button onClick={() => remove(a)} className="rounded p-1.5 text-gray-400 hover:text-danger" title="حذف"><IconTrash width={14} height={14} /></button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
        <p className="mt-3 text-sm text-soft">جارٍ تحميل بيانات الكتالوج…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold text-ink">بيانات الكتالوج 📋</h1>
      <p className="text-sm text-soft">إدارة التصنيفات وقوائم الخيارات (التجليد، المقاس، الورق) التي تظهر في نموذج الكتاب.</p>

      {/* Categories */}
      <section className="card border border-line/70 p-5">
        <h2 className="mb-4 text-base font-bold text-ink">التصنيفات</h2>
        <form onSubmit={catSubmit} className="mb-4 flex gap-2 flex-wrap">
          <input
            value={catForm.name_ar}
            onChange={(e) => setCatForm({ ...catForm, name_ar: e.target.value })}
            placeholder="اسم التصنيف بالعربية"
            className="input flex-1 min-w-[180px]"
          />
          <input
            type="number"
            value={catForm.sort}
            onChange={(e) => setCatForm({ ...catForm, sort: e.target.value })}
            placeholder="الترتيب"
            className="input w-20"
            min="0"
          />
          <button type="submit" className="btn-primary shrink-0">
            {catEditId ? 'حفظ' : <IconPlus width={16} height={16} />}
          </button>
          {catEditId && (
            <button type="button" onClick={() => { setCatForm({ name_ar: '', sort: '' }); setCatEditId(null); setCatErrors({}); }} className="btn-ghost shrink-0">
              إلغاء
            </button>
          )}
          {catErrors.name_ar && <span className="text-xs text-danger flex-1 w-full basis-full">{catErrors.name_ar}</span>}
        </form>
        <ul className="divide-y divide-line/60">
          {cats.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 py-2">
              <span className="text-sm font-medium text-ink">{c.name_ar}</span>
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-soft">ترتيب: {c.sort}</span>
                <button onClick={() => catStartEdit(c)} className="rounded p-1.5 text-gray-400 hover:text-brand" title="تعديل"><IconEdit width={14} height={14} /></button>
                <button onClick={() => catDelete(c)} className="rounded p-1.5 text-gray-400 hover:text-danger" title="حذف"><IconTrash width={14} height={14} /></button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Attributes */}
      <section className="card border border-line/70 p-5">
        <h2 className="mb-4 text-base font-bold text-ink">خيارات السمات (التجليد / المقاس / الورق)</h2>
        <div className="space-y-6">
          {TYPES.map((t) => attrForm(t))}
        </div>
      </section>

      <p className="text-xs text-soft text-center">
        التغييرات هنا تظهر تلقائياً في نموذج إضافة/تعديل الكتاب وفي القائمة العلوية/التذييل.
       書籍 التصنيف يبقى حقلاً نصياً في جدول books — التأكد من تطابق الاسم عند إعادة التسمية.
      </p>
    </div>
  );
}