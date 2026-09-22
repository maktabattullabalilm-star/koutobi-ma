import { useEffect, useState } from 'react';
import {
  adminCreateAttributeOption,
  adminCreateCategory,
  adminDeleteAttributeOption,
  adminDeleteCategory,
  adminGetAttributeOptions,
  adminGetBooks,
  adminGetCategories,
  adminPropagateRename,
  adminReassignBooks,
  adminReorderRows,
  adminUpdateAttributeOption,
  adminUpdateCategory,
} from '../../lib/admin';
import { ATTRIBUTE_COLUMNS, countByColumn, nextSort, reorderList } from '../../lib/catalog';
import { useToast } from '../../components/Toast';
import { IconArrowDown, IconArrowUp, IconEdit, IconPlus, IconTrash } from '../../components/icons';
import PageHeader from './PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const TYPES = ['binding', 'size', 'paper'];
const TYPE_LABEL = { binding: 'التجليد', size: 'المقاس', paper: 'الورق' };
const TYPE_PLACEHOLDER = { binding: 'مثال: تجليد فني', size: 'مثال: 17 × 24 سم', paper: 'مثال: شامواه' };

const booksWord = (n) => (n === 1 ? 'كتاب واحد' : n === 2 ? 'كتابان' : `${n} كتب`);

function MoveButtons({ onUp, onDown, upDisabled, downDisabled }) {
  return (
    <div className="flex items-center gap-0.5" dir="ltr">
      <button type="button" onClick={onUp} disabled={upDisabled} title="تحريك لأعلى" aria-label="تحريك لأعلى" className="flex h-9 w-9 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-ink disabled:opacity-30"><IconArrowUp width={14} height={14} /></button>
      <button type="button" onClick={onDown} disabled={downDisabled} title="تحريك لأسفل" aria-label="تحريك لأسفل" className="flex h-9 w-9 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-ink disabled:opacity-30"><IconArrowDown width={14} height={14} /></button>
    </div>
  );
}

/**
 * Guarded delete panel: shown when the value is used by books.
 * Forces picking a replacement first — nothing gets orphaned.
 */
function ReassignDelete({ itemLabel, usage, options, onConfirm, onCancel, busy }) {
  const [to, setTo] = useState('');
  return (
    <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-3">
      <p className="text-xs font-bold leading-5 text-amber-800">
        «{itemLabel}» مستعمل في {booksWord(usage)} — اختر تصنيفاً بديلاً لنقل كتبه إليه قبل الحذف.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Select value={to} onValueChange={setTo}>
          <SelectTrigger className="min-w-[180px] flex-1 bg-white" aria-label="البديل">
            <SelectValue placeholder="اختر البديل…" />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button disabled={!to || busy} onClick={() => onConfirm(to)} className="shrink-0">
          {busy ? '…' : 'نقل الكتب وحذف'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} className="shrink-0">
          إلغاء
        </Button>
      </div>
    </div>
  );
}

/**
 * Guarded inline confirm: same amber voice as ReassignDelete, without the
 * replacement picker — for zero-usage deletes and rename propagation.
 * Nothing on this page ever uses a native browser dialog.
 */
function GuardConfirm({ text, confirmLabel = 'تأكيد', onConfirm, onCancel, busy }) {
  return (
    <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-3">
      <p className="text-xs font-bold leading-5 text-amber-800">{text}</p>
      <div className="mt-2 flex gap-2">
        <Button size="sm" disabled={busy} onClick={onConfirm} className="shrink-0">
          {busy ? '…' : confirmLabel}
        </Button>
        <Button size="sm" type="button" variant="ghost" onClick={onCancel} className="shrink-0">
          إلغاء
        </Button>
      </div>
    </div>
  );
}

function AttributeManager({ type, items, usage, onReload }) {
  const { show } = useToast();
  const [value, setValue] = useState('');
  const [editId, setEditId] = useState(null);
  const [draft, setDraft] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [guardDelete, setGuardDelete] = useState(null);
  const [guardRename, setGuardRename] = useState(null);
  const [busy, setBusy] = useState(false);
  const column = ATTRIBUTE_COLUMNS[type];

  const add = async (e) => {
    e.preventDefault();
    const v = value.trim();
    if (!v) return;
    if (items.some((a) => a.value_ar === v)) {
      show('هذه القيمة موجودة بالفعل', 'error');
      return;
    }
    try {
      await adminCreateAttributeOption({ type, value_ar: v, sort: nextSort(items) });
      setValue('');
      show('تمت الإضافة ✓');
      onReload();
    } catch (err) {
      show(err.message, 'error');
    }
  };

  const move = async (id, dir) => {
    const reordered = reorderList([...items].sort((a, b) => a.sort - b.sort), id, dir);
    if (!reordered) return;
    setBusy(true);
    try {
      await adminReorderRows('attribute_options', reordered.map((r) => r.id));
      onReload();
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const rename = async (item, v) => {
    const n = usage[item.value_ar] || 0;
    try {
      await adminUpdateAttributeOption(item.id, { value_ar: v });
      if (n > 0) await adminPropagateRename(column, item.value_ar, v);
      setEditId(null);
      setGuardRename(null);
      show('تمت إعادة التسمية وتحديث الكتب ✓');
      onReload();
    } catch (err) {
      show(err.message, 'error');
    }
  };

  const saveRename = (item) => {
    const v = draft.trim();
    if (!v) return;
    if (v === item.value_ar) {
      setEditId(null);
      return;
    }
    if (items.some((a) => a.value_ar === v)) {
      show('هذه القيمة موجودة بالفعل', 'error');
      return;
    }
    const n = usage[item.value_ar] || 0;
    if (n > 0) {
      setGuardRename({ item, value: v });
      setEditId(null);
      return;
    }
    rename(item, v);
  };

  const remove = async (item, replacement) => {
    setBusy(true);
    try {
      if (replacement) await adminReassignBooks(column, item.value_ar, replacement);
      await adminDeleteAttributeOption(item.id);
      setDeletingId(null);
      setGuardDelete(null);
      show(replacement ? 'تم نقل الكتب والحذف ✓' : 'تم الحذف');
      onReload();
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const askDelete = (item) => {
    const n = usage[item.value_ar] || 0;
    if (n === 0) {
      setDeletingId(null);
      setGuardDelete(item);
    } else {
      setGuardDelete(null);
      setDeletingId(item.id);
    }
  };

  const ordered = [...items].sort((a, b) => a.sort - b.sort);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-ink">{TYPE_LABEL[type] || type}</h3>
      <form onSubmit={add} className="flex flex-wrap gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`${TYPE_PLACEHOLDER[type] || 'قيمة جديدة'} — تُضاف في الآخر`}
          className="min-w-[160px] flex-1"
          aria-label={`قيمة جديدة لـ${TYPE_LABEL[type] || type}`}
        />
        <Button type="submit" className="shrink-0">
          <IconPlus width={16} height={16} /> إضافة
        </Button>
      </form>
      <ul className="divide-y divide-line/60">
        {ordered.length === 0 && (
          <li className="py-4 text-center text-sm text-soft">لا توجد قيم بعد — أضف أول قيمة من الأعلى.</li>
        )}
        {ordered.map((a, ix) => {
          const n = usage[a.value_ar] || 0;
          return (
            <li key={a.id} className="py-2">
              <div className="flex items-center justify-between gap-2">
                {editId === a.id ? (
                  <div className="flex min-w-0 flex-1 gap-2">
                    <Input value={draft} onChange={(e) => setDraft(e.target.value)} className="flex-1" aria-label="الاسم الجديد" />
                    <Button size="sm" onClick={() => saveRename(a)}>حفظ</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>إلغاء</Button>
                  </div>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                      {a.value_ar}
                      <span className="ms-2 text-[11px] font-normal text-soft">
                        {n > 0 ? `مستعملة في ${booksWord(n)}` : 'غير مستعملة'}
                      </span>
                    </span>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <MoveButtons
                        onUp={() => move(a.id, -1)}
                        onDown={() => move(a.id, 1)}
                        upDisabled={busy || ix === 0}
                        downDisabled={busy || ix === ordered.length - 1}
                      />
                      <button onClick={() => { setDraft(a.value_ar); setEditId(a.id); }} className="flex h-9 w-9 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-brand" title="إعادة تسمية" aria-label="إعادة تسمية"><IconEdit width={14} height={14} /></button>
                      <button onClick={() => askDelete(a)} className="flex h-9 w-9 items-center justify-center rounded-md text-gray-400 transition hover:bg-rose-50 hover:text-danger" title="حذف" aria-label="حذف"><IconTrash width={14} height={14} /></button>
                    </div>
                  </>
                )}
              </div>
              {deletingId === a.id && (
                <ReassignDelete
                  itemLabel={a.value_ar}
                  usage={n}
                  options={ordered.filter((x) => x.id !== a.id).map((x) => x.value_ar)}
                  onConfirm={(to) => remove(a, to)}
                  onCancel={() => setDeletingId(null)}
                  busy={busy}
                />
              )}
              {guardDelete && guardDelete.id === a.id && (
                <GuardConfirm
                  text={`حذف «${a.value_ar}» نهائياً؟ لا تستعمله أي كتب.`}
                  confirmLabel="حذف"
                  busy={busy}
                  onCancel={() => setGuardDelete(null)}
                  onConfirm={() => { const g = guardDelete; setGuardDelete(null); remove(g, null); }}
                />
              )}
              {guardRename && guardRename.item.id === a.id && (
                <GuardConfirm
                  text={`«${a.value_ar}» مستعملة في ${booksWord(n)} — سيتم تحديثها إلى «${guardRename.value}».`}
                  confirmLabel="تحديث الكتب"
                  busy={busy}
                  onCancel={() => setGuardRename(null)}
                  onConfirm={() => rename(guardRename.item, guardRename.value)}
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function CatalogData() {
  const { show } = useToast();

  const [cats, setCats] = useState([]);
  const [attrs, setAttrs] = useState({});
  const [usage, setUsage] = useState({});
  const [catName, setCatName] = useState('');
  const [editCatId, setEditCatId] = useState(null);
  const [editCatDraft, setEditCatDraft] = useState('');
  const [deletingCatId, setDeletingCatId] = useState(null);
  const [guardCatDelete, setGuardCatDelete] = useState(null);
  const [guardCatRename, setGuardCatRename] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [cList, ...aLists] = await Promise.all([
        adminGetCategories(),
        ...TYPES.map((t) => adminGetAttributeOptions(t)),
      ]);
      const books = await adminGetBooks().catch(() => []);
      setCats([...cList].sort((a, b) => a.sort - b.sort));
      const byType = {};
      TYPES.forEach((t, i) => {
        byType[t] = aLists[i];
      });
      setAttrs(byType);
      const u = { category: countByColumn(books, 'category') };
      TYPES.forEach((t) => {
        u[t] = countByColumn(books, ATTRIBUTE_COLUMNS[t]);
      });
      setUsage(u);
    } catch (e) {
      show(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const orderedCats = [...cats].sort((a, b) => a.sort - b.sort);

  const addCat = async (e) => {
    e.preventDefault();
    const v = catName.trim();
    if (!v) return;
    if (cats.some((c) => c.name_ar === v)) {
      show('تصنيف بهذا الاسم موجود بالفعل', 'error');
      return;
    }
    try {
      await adminCreateCategory({ name_ar: v, sort: nextSort(cats) });
      setCatName('');
      show('تمت إضافة التصنيف في الآخر ✓');
      load();
    } catch (err) {
      show(err.message, 'error');
    }
  };

  const moveCat = async (id, dir) => {
    const reordered = reorderList(orderedCats, id, dir);
    if (!reordered) return;
    setBusy(true);
    try {
      await adminReorderRows('categories', reordered.map((r) => r.id));
      load();
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const renameCat = async (cat, v) => {
    const n = (usage.category || {})[cat.name_ar] || 0;
    try {
      await adminUpdateCategory(cat.id, { name_ar: v });
      if (n > 0) await adminPropagateRename('category', cat.name_ar, v);
      setEditCatId(null);
      setGuardCatRename(null);
      show('تمت إعادة التسمية وتحديث الكتب ✓');
      load();
    } catch (err) {
      show(err.message, 'error');
    }
  };

  const saveCatRename = (cat) => {
    const v = editCatDraft.trim();
    if (!v) return;
    if (v === cat.name_ar) {
      setEditCatId(null);
      return;
    }
    if (cats.some((c) => c.name_ar === v)) {
      show('تصنيف بهذا الاسم موجود بالفعل', 'error');
      return;
    }
    const n = (usage.category || {})[cat.name_ar] || 0;
    if (n > 0) {
      setGuardCatRename({ cat, value: v });
      setEditCatId(null);
      return;
    }
    renameCat(cat, v);
  };

  const removeCat = async (cat, replacement) => {
    setBusy(true);
    try {
      if (replacement) await adminReassignBooks('category', cat.name_ar, replacement);
      await adminDeleteCategory(cat.id);
      setDeletingCatId(null);
      setGuardCatDelete(null);
      show(replacement ? 'تم نقل الكتب والحذف ✓' : 'تم حذف التصنيف');
      load();
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const askDeleteCat = (cat) => {
    const n = (usage.category || {})[cat.name_ar] || 0;
    if (n === 0) {
      setDeletingCatId(null);
      setGuardCatDelete(cat);
    } else {
      setGuardCatDelete(null);
      setDeletingCatId(cat.id);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
        <p className="mt-3 text-sm text-soft">جارٍ تحميل التصنيفات والخيارات…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title="التصنيفات والخيارات"
        description="التصنيفات وقوائم الخيارات (التجليد، المقاس، الورق) التي تظهر في نموذج الكتاب. أي تغيير هنا ينعكس على الكتب تلقائياً."
        crumbs={[{ label: 'لوحة التحكم', to: '/admin/dashboard' }, { label: 'التصنيفات والخيارات' }]}
      />

      {/* Categories */}
      <section className="card border border-line/70 p-5">
        <h2 className="admin-section-title mb-1">التصنيفات</h2>
        <p className="mb-4 text-xs text-soft">تُضاف في الآخر — رتّبها بالأسهم. إعادة التسمية تُحدّث الكتب تلقائياً.</p>
        <form onSubmit={addCat} className="mb-4 flex flex-wrap gap-2">
          <Input
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            placeholder="اسم التصنيف الجديد، مثال: السيرة النبوية"
            className="min-w-[180px] flex-1"
            aria-label="اسم التصنيف الجديد"
          />
          <Button type="submit" className="shrink-0">
            <IconPlus width={16} height={16} /> إضافة
          </Button>
        </form>
        <ul className="divide-y divide-line/60">
          {orderedCats.length === 0 && (
            <li className="py-6 text-center text-sm text-soft">لا توجد تصنيفات بعد — أضف أول تصنيف من الأعلى.</li>
          )}
          {orderedCats.map((c, ix) => {
            const n = (usage.category || {})[c.name_ar] || 0;
            return (
              <li key={c.id} className="py-2">
                <div className="flex items-center justify-between gap-2">
                  {editCatId === c.id ? (
                    <div className="flex min-w-0 flex-1 gap-2">
                      <Input value={editCatDraft} onChange={(e) => setEditCatDraft(e.target.value)} className="flex-1" aria-label="الاسم الجديد" />
                      <Button size="sm" onClick={() => saveCatRename(c)}>حفظ</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditCatId(null)}>إلغاء</Button>
                    </div>
                  ) : (
                    <>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                        {c.name_ar}
                        <span className="ms-2 text-[11px] font-normal text-soft">
                          {n > 0 ? `مستعمل في ${booksWord(n)}` : 'غير مستعمل'}
                        </span>
                      </span>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <MoveButtons
                          onUp={() => moveCat(c.id, -1)}
                          onDown={() => moveCat(c.id, 1)}
                          upDisabled={busy || ix === 0}
                          downDisabled={busy || ix === orderedCats.length - 1}
                        />
                        <button onClick={() => { setEditCatDraft(c.name_ar); setEditCatId(c.id); }} className="flex h-9 w-9 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-brand" title="إعادة تسمية" aria-label="إعادة تسمية"><IconEdit width={14} height={14} /></button>
                        <button onClick={() => askDeleteCat(c)} className="flex h-9 w-9 items-center justify-center rounded-md text-gray-400 transition hover:bg-rose-50 hover:text-danger" title="حذف" aria-label="حذف"><IconTrash width={14} height={14} /></button>
                      </div>
                    </>
                  )}
                </div>
                {deletingCatId === c.id && (
                  <ReassignDelete
                    itemLabel={c.name_ar}
                    usage={n}
                    options={orderedCats.filter((x) => x.id !== c.id).map((x) => x.name_ar)}
                    onConfirm={(to) => removeCat(c, to)}
                    onCancel={() => setDeletingCatId(null)}
                    busy={busy}
                  />
                )}
                {guardCatDelete && guardCatDelete.id === c.id && (
                  <GuardConfirm
                    text={`حذف تصنيف «${c.name_ar}» نهائياً؟ لا تستعمله أي كتب.`}
                    confirmLabel="حذف"
                    busy={busy}
                    onCancel={() => setGuardCatDelete(null)}
                    onConfirm={() => { const g = guardCatDelete; setGuardCatDelete(null); removeCat(g, null); }}
                  />
                )}
                {guardCatRename && guardCatRename.cat.id === c.id && (
                  <GuardConfirm
                    text={`«${c.name_ar}» مستعمل في ${booksWord(n)} — سيتم تحديثها إلى «${guardCatRename.value}».`}
                    confirmLabel="تحديث الكتب"
                    busy={busy}
                    onCancel={() => setGuardCatRename(null)}
                    onConfirm={() => renameCat(guardCatRename.cat, guardCatRename.value)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Attributes */}
      <section className="card border border-line/70 p-5">
        <h2 className="admin-section-title mb-1">خيارات الطبعة (التجليد / المقاس / الورق)</h2>
        <p className="mb-4 text-xs text-soft">القيم التي يختار منها نموذج الكتاب. إعادة التسمية تُحدّث الكتب تلقائياً.</p>
        <div className="space-y-6">
          {TYPES.map((t) => (
            <AttributeManager
              key={t}
              type={t}
              items={[...(attrs[t] || [])].sort((a, b) => a.sort - b.sort)}
              usage={usage[t] || {}}
              onReload={load}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
