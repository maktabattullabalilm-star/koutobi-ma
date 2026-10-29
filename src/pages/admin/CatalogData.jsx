import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, GripVertical } from 'lucide-react';
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
  adminUpdateAppSetting,
  adminUpdateAttributeOption,
  adminUpdateCategory,
  getAppSetting,
} from '../../lib/admin';
import {
  ATTRIBUTE_COLUMNS,
  EDITION_SPEC_LABELS,
  EDITION_SPEC_TYPES,
  HIDDEN_EDITION_SPECS_KEY,
  buildCategoryTree,
  categorySiblings,
  categorySubtreeIds,
  countByColumn,
  flattenCategoryTree,
  nextSort,
  parseHiddenEditionSpecs,
  reorderList,
} from '../../lib/catalog';
import { useToast } from '../../components/Toast';
import {
  IconArrowDown,
  IconArrowUp,
  IconBook,
  IconEdit,
  IconGrid,
  IconLayers,
  IconPlus,
  IconRuler,
  IconTrash,
} from '../../components/icons';
import PageHeader from '../../components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const TYPES = EDITION_SPEC_TYPES;
const TYPE_LABEL = EDITION_SPEC_LABELS;
const TYPE_PLACEHOLDER = { binding: 'مثال: تجليد فني', size: 'مثال: 17 × 24 سم', paper: 'مثال: شامواه' };
const ROOT_DROP = '__root__';
const SELECT_ROOT = '__root__';

const booksWord = (n) => (n === 1 ? 'كتاب واحد' : n === 2 ? 'كتابان' : `${n} كتب`);
const indent = (depth) => (depth > 0 ? `${'— '.repeat(depth)}` : '');

function MoveButtons({ onUp, onDown, upDisabled, downDisabled }) {
  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={onUp}
        disabled={upDisabled}
        title="تحريك لأعلى"
        aria-label="تحريك لأعلى"
        className="flex h-9 w-9 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100 hover:text-ink disabled:opacity-30"
      >
        <IconArrowUp width={14} height={14} />
      </button>
      <button
        type="button"
        onClick={onDown}
        disabled={downDisabled}
        title="تحريك لأسفل"
        aria-label="تحريك لأسفل"
        className="flex h-9 w-9 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100 hover:text-ink disabled:opacity-30"
      >
        <IconArrowDown width={14} height={14} />
      </button>
    </div>
  );
}

/**
 * Guarded delete panel: shown when the value is used by books.
 * Forces picking a replacement first — nothing gets orphaned.
 */
function ReassignDelete({ itemLabel, usage, options, note, onConfirm, onCancel, busy }) {
  const [to, setTo] = useState('');
  return (
    <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-3">
      <p className="text-xs font-bold leading-5 text-amber-800">
        «{itemLabel}» مستعمل في {booksWord(usage)} — اختر تصنيفاً بديلاً لنقل كتبه إليه قبل الحذف.
      </p>
      {note && <p className="mt-1 text-xs leading-5 text-amber-700">{note}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        <Select value={to} onValueChange={setTo}>
          <SelectTrigger className="min-w-[180px] flex-1 bg-white" aria-label="البديل">
            <SelectValue placeholder="اختر البديل…" />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
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
function GuardConfirm({ text, note, confirmLabel = 'تأكيد', onConfirm, onCancel, busy }) {
  return (
    <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-3">
      <p className="text-xs font-bold leading-5 text-amber-800">{text}</p>
      {note && <p className="mt-1 text-xs leading-5 text-amber-700">{note}</p>}
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

const TYPE_ICON = { binding: IconBook, size: IconRuler, paper: IconLayers };

/**
 * Usage pill: the visual weight of a term. Green = load-bearing books depend
 * on it (guarded actions); gray = safe to delete. The page's whole job is
 * this dependency, so it gets real chrome instead of faint gray text.
 */
function UsagePill({ n, emptyLabel }) {
  if (n <= 0) {
    return (
      <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-soft">
        {emptyLabel}
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full bg-brand-light px-2 py-0.5 text-[11px] font-bold tabular-nums text-brand">
      {booksWord(n)}
    </span>
  );
}

function CountBadge({ n }) {
  return (
    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold tabular-nums text-soft">
      {n}
    </span>
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
    const reordered = reorderList(
      [...items].sort((a, b) => a.sort - b.sort),
      id,
      dir
    );
    if (!reordered) return;
    setBusy(true);
    try {
      await adminReorderRows(
        'attribute_options',
        reordered.map((r) => r.id)
      );
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
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-light text-brand">
          {(() => {
            const I = TYPE_ICON[type];
            return I ? <I width={15} height={15} /> : null;
          })()}
        </span>
        <h3 className="text-sm font-bold text-ink">{TYPE_LABEL[type] || type}</h3>
        <CountBadge n={items.length} />
      </div>
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
            <li key={a.id} className="-mx-2 rounded-lg px-2 py-2 transition hover:bg-gray-50">
              <div className="flex items-center justify-between gap-2">
                {editId === a.id ? (
                  <div className="flex min-w-0 flex-1 gap-2">
                    <Input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      className="flex-1"
                      aria-label="الاسم الجديد"
                    />
                    <Button size="sm" onClick={() => saveRename(a)}>
                      حفظ
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>
                      إلغاء
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{a.value_ar}</span>
                    <UsagePill n={n} emptyLabel="غير مستعملة" />
                    <div className="flex shrink-0 items-center gap-0.5">
                      <MoveButtons
                        onUp={() => move(a.id, -1)}
                        onDown={() => move(a.id, 1)}
                        upDisabled={busy || ix === 0}
                        downDisabled={busy || ix === ordered.length - 1}
                      />
                      <button
                        onClick={() => {
                          setDraft(a.value_ar);
                          setEditId(a.id);
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100 hover:text-brand"
                        title="إعادة تسمية"
                        aria-label="إعادة تسمية"
                      >
                        <IconEdit width={14} height={14} />
                      </button>
                      <button
                        onClick={() => askDelete(a)}
                        className="flex h-9 w-9 items-center justify-center rounded-md text-gray-500 transition hover:bg-rose-50 hover:text-danger"
                        title="حذف"
                        aria-label="حذف"
                      >
                        <IconTrash width={14} height={14} />
                      </button>
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
                  onConfirm={() => {
                    const g = guardDelete;
                    setGuardDelete(null);
                    remove(g, null);
                  }}
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
  const [catParent, setCatParent] = useState('');
  const [editCat, setEditCat] = useState(null);
  const [deletingCatId, setDeletingCatId] = useState(null);
  const [guardCatDelete, setGuardCatDelete] = useState(null);
  const [guardCatRename, setGuardCatRename] = useState(null);
  const [hiddenSpecs, setHiddenSpecs] = useState([]);
  const [savingSpec, setSavingSpec] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState(TYPES[0]);
  // Drag-and-drop changes stay local until the librarian presses «حفظ التغييرات».
  const [pendingMoves, setPendingMoves] = useState({});
  const [draggingId, setDraggingId] = useState(null);
  const [dropTargetId, setDropTargetId] = useState(null);
  const [savingMoves, setSavingMoves] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cList, hiddenRaw, ...aLists] = await Promise.all([
        adminGetCategories(),
        getAppSetting(HIDDEN_EDITION_SPECS_KEY),
        ...TYPES.map((t) => adminGetAttributeOptions(t)),
      ]);
      const books = await adminGetBooks().catch(() => []);
      setCats([...cList].sort((a, b) => a.sort - b.sort));
      setPendingMoves({});
      setDraggingId(null);
      setDropTargetId(null);
      setHiddenSpecs(parseHiddenEditionSpecs(hiddenRaw));
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
  }, [show]);

  useEffect(() => {
    load();
  }, [load]);

  const draftCats = useMemo(() => {
    if (!Object.keys(pendingMoves).length) return cats;
    return cats.map((cat) => (pendingMoves[cat.id] ? { ...cat, ...pendingMoves[cat.id] } : cat));
  }, [cats, pendingMoves]);
  const catsById = useMemo(() => new Map(cats.map((cat) => [cat.id, cat])), [cats]);
  const flatCats = useMemo(() => flattenCategoryTree(buildCategoryTree(draftCats)), [draftCats]);
  const childrenCount = useMemo(() => {
    const counts = {};
    draftCats.forEach((cat) => {
      if (cat.parent_id) counts[cat.parent_id] = (counts[cat.parent_id] || 0) + 1;
    });
    return counts;
  }, [draftCats]);
  const totalAttrs = TYPES.reduce((s, t) => s + (attrs[t] || []).length, 0);
  const subCatCount = draftCats.filter((cat) => cat.parent_id).length;
  const pendingCount = Object.keys(pendingMoves).length;
  const hasPending = pendingCount > 0;

  const focusAddForm = () => {
    const el = document.getElementById('cat-name-input');
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => el?.focus(), 0);
  };

  const addCat = async (e) => {
    e.preventDefault();
    const v = catName.trim();
    if (!v) return;
    if (cats.some((c) => c.name_ar === v)) {
      show('تصنيف بهذا الاسم موجود بالفعل', 'error');
      return;
    }
    const parentId = catParent || null;
    try {
      await adminCreateCategory({
        name_ar: v,
        sort: nextSort(categorySiblings(cats, parentId)),
        parent_id: parentId,
      });
      setCatName('');
      show(parentId ? 'تمت إضافة التصنيف الفرعي ✓' : 'تمت إضافة التصنيف في الآخر ✓');
      load();
    } catch (err) {
      show(err.message, 'error');
    }
  };

  const moveCat = async (cat, dir) => {
    const siblings = categorySiblings(cats, cat.parent_id ?? null);
    const reordered = reorderList(siblings, cat.id, dir);
    if (!reordered) return;
    setBusy(true);
    try {
      await adminReorderRows(
        'categories',
        reordered.map((r) => r.id)
      );
      load();
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  /** A drop is valid unless it targets the node itself, a descendant, or its current parent. */
  const canDropOn = (targetId) => {
    if (!draggingId) return false;
    const dragged = catsById.get(draggingId);
    if (!dragged) return false;
    const currentParent = pendingMoves[draggingId]?.parent_id ?? dragged.parent_id ?? null;
    if (targetId === ROOT_DROP) return currentParent !== null;
    if (!targetId || targetId === draggingId) return false;
    if (categorySubtreeIds(draftCats, draggingId).has(targetId)) return false;
    return targetId !== currentParent;
  };

  /** Stage a reparent locally. Nothing is written until the save bar is used. */
  const dropOn = (targetId) => {
    const sourceId = draggingId;
    if (!sourceId || !canDropOn(targetId)) {
      setDropTargetId(null);
      return;
    }
    const source = catsById.get(sourceId);
    if (!source) return;
    const nextParent = targetId === ROOT_DROP ? null : targetId;
    const originalParent = source.parent_id ?? null;

    if (nextParent === originalParent) {
      // Dragging back to the original parent simply removes the pending move.
      setPendingMoves((prev) => {
        if (!prev[sourceId]) return prev;
        const next = { ...prev };
        delete next[sourceId];
        return next;
      });
    } else {
      const siblings = categorySiblings(draftCats, nextParent).filter((row) => row.id !== sourceId);
      setPendingMoves((prev) => ({
        ...prev,
        [sourceId]: { parent_id: nextParent, sort: nextSort(siblings) },
      }));
    }
    setDraggingId(null);
    setDropTargetId(null);
  };

  const saveMoves = async () => {
    const moves = Object.entries(pendingMoves).map(([id, patch]) => ({ id, ...patch }));
    if (!moves.length) return;
    setSavingMoves(true);
    setBusy(true);
    try {
      for (const move of moves) {
        await adminUpdateCategory(move.id, { parent_id: move.parent_id, sort: move.sort });
      }
      show('تم حفظ التصنيفات الفرعية ✓');
      load();
    } catch (err) {
      show(err.message, 'error');
      // Reload so the tree matches whatever the database actually stored.
      load();
    } finally {
      setSavingMoves(false);
      setBusy(false);
    }
  };

  const cancelMoves = () => {
    setPendingMoves({});
    setDraggingId(null);
    setDropTargetId(null);
  };

  const renameCat = async (cat, v, parentId = cat.parent_id ?? null) => {
    const n = (usage.category || {})[cat.name_ar] || 0;
    const nextParent = parentId || null;
    const parentChanged = (cat.parent_id ?? null) !== nextParent;
    try {
      const patch = { name_ar: v };
      if (parentChanged) {
        patch.parent_id = nextParent;
        patch.sort = nextSort(categorySiblings(cats, nextParent));
      }
      await adminUpdateCategory(cat.id, patch);
      if (n > 0 && v !== cat.name_ar) await adminPropagateRename('category', cat.name_ar, v);
      setEditCat(null);
      setGuardCatRename(null);
      show(parentChanged ? 'تمت إعادة التسمية والنقل وتحديث الكتب ✓' : 'تمت إعادة التسمية وتحديث الكتب ✓');
      load();
    } catch (err) {
      show(err.message, 'error');
    }
  };

  const saveCatEdit = (cat) => {
    const v = editCat?.name?.trim() || '';
    if (!v) return;
    const nextParent = editCat.parentId || null;
    const parentChanged = (cat.parent_id ?? null) !== nextParent;
    if (!parentChanged && v === cat.name_ar) {
      setEditCat(null);
      return;
    }
    if (cats.some((c) => c.name_ar === v && c.id !== cat.id)) {
      show('تصنيف بهذا الاسم موجود بالفعل', 'error');
      return;
    }
    if (nextParent && categorySubtreeIds(cats, cat.id).has(nextParent)) {
      show('لا يمكن نقل تصنيف تحت نفسه أو تحت أحد تصنيفاته الفرعية', 'error');
      return;
    }
    const n = (usage.category || {})[cat.name_ar] || 0;
    if (v !== cat.name_ar && n > 0) {
      setGuardCatRename({ cat, value: v, parentId: nextParent });
      setEditCat(null);
      return;
    }
    renameCat(cat, v, nextParent);
  };

  const removeCat = async (cat, replacement) => {
    setBusy(true);
    const moved = (childrenCount[cat.id] || 0) > 0;
    try {
      if (replacement) await adminReassignBooks('category', cat.name_ar, replacement);
      await adminDeleteCategory(cat.id);
      setDeletingCatId(null);
      setGuardCatDelete(null);
      const detail = `${replacement ? 'تم نقل الكتب' : ''}${replacement && moved ? '، ' : ''}${moved ? 'ورفع التصنيفات الفرعية' : ''}`;
      show(detail ? `${detail} والحذف ✓` : 'تم حذف التصنيف');
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

  const toggleSpec = async (type, visible) => {
    const previous = hiddenSpecs;
    const wanted = new Set(visible ? previous.filter((t) => t !== type) : [...previous, type]);
    const next = TYPES.filter((t) => wanted.has(t));
    setHiddenSpecs(next);
    setSavingSpec(type);
    try {
      await adminUpdateAppSetting(HIDDEN_EDITION_SPECS_KEY, JSON.stringify(next));
      show(
        visible
          ? `تم إظهار ${TYPE_LABEL[type]} في صفحة الكتاب`
          : `تم إخفاء ${TYPE_LABEL[type]} من صفحة الكتاب`
      );
    } catch (err) {
      setHiddenSpecs(previous);
      show(err.message, 'error');
    } finally {
      setSavingSpec('');
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
        description="التصنيفات الشجرية وقوائم الخيارات (التجليد، المقاس، الورق) التي تظهر في نموذج الكتاب. أي تغيير هنا ينعكس على الكتب تلقائياً."
        crumbs={[{ label: 'لوحة التحكم', to: '/admin/dashboard' }, { label: 'التصنيفات والخيارات' }]}
      />

      {/* Categories */}
      <section className="card border border-line/70 p-5">
        <div className="mb-1 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-light text-brand">
            <IconGrid width={15} height={15} />
          </span>
          <h2 className="admin-section-title">التصنيفات</h2>
          <CountBadge n={cats.length} />
          {subCatCount > 0 && (
            <span className="rounded-full bg-brand-pale px-2 py-0.5 text-[11px] font-bold text-brand">
              {subCatCount} فرعي
            </span>
          )}
        </div>
        <p className="mb-4 text-xs text-soft">
          اسحب أي تصنيف وأفلته على تصنيف آخر ليصبح فرعياً منه، أو أفلته في الصندوق المخصص ليعود رئيسياً.
          التغييرات تُحفظ فقط عند الضغط على «حفظ التغييرات». يمكنك أيضاً استخدام زر التعديل ✎ لتغيير الأب.
        </p>

        {hasPending && (
          <div className="sticky top-2 z-20 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 shadow-sm">
            <p className="text-xs font-bold leading-5 text-amber-800">
              لديك {pendingCount} تغيير في الشجرة غير محفوظ — راجع ثم اضغط «حفظ التغييرات».
            </p>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" onClick={saveMoves} disabled={savingMoves || busy}>
                {savingMoves ? 'جارٍ الحفظ…' : 'حفظ التغييرات'}
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelMoves} disabled={savingMoves || busy}>
                إلغاء
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={addCat} className="mb-4 space-y-2">
          <div className="flex flex-wrap gap-2">
            <Input
              id="cat-name-input"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="اسم التصنيف الجديد، مثال: علم القراءات"
              className="min-w-[180px] flex-1"
              aria-label="اسم التصنيف الجديد"
              disabled={hasPending}
            />
            <Button type="submit" className="shrink-0" disabled={hasPending}>
              <IconPlus width={16} height={16} /> إضافة
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-soft">إضافة تحت:</span>
            <Select
              value={catParent || SELECT_ROOT}
              onValueChange={(v) => setCatParent(v === SELECT_ROOT ? '' : v)}
              disabled={hasPending}
            >
              <SelectTrigger className="max-w-xs bg-white" aria-label="التصنيف الأب">
                <SelectValue placeholder="تصنيف رئيسي" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_ROOT}>تصنيف رئيسي (بدون أب)</SelectItem>
                {flatCats.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {indent(c.depth)}
                    {c.name_ar}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {catParent && (
              <span className="text-xs text-brand">
                تحت «{cats.find((c) => c.id === catParent)?.name_ar}»
              </span>
            )}
          </div>
          {hasPending && (
            <p className="text-[11px] font-semibold text-amber-700">
              احفظ أو ألغِ تغييرات السحب أولاً لتتمكن من الإضافة أو التعديل.
            </p>
          )}
        </form>

        <div
          onDragOver={(e) => {
            if (!canDropOn(ROOT_DROP)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (dropTargetId !== ROOT_DROP) setDropTargetId(ROOT_DROP);
          }}
          onDrop={(e) => {
            e.preventDefault();
            dropOn(ROOT_DROP);
          }}
          className={`mb-2 rounded-lg border-2 border-dashed px-3 py-2 text-center text-[11px] font-semibold transition ${
            dropTargetId === ROOT_DROP
              ? 'border-brand bg-brand-pale text-brand'
              : draggingId
                ? 'border-brand/50 bg-brand-pale/30 text-brand'
                : 'border-line text-soft'
          }`}
        >
          {draggingId
            ? 'أفلت هنا لجعل التصنيف رئيسياً (بدون أب)'
            : 'صندوق التصنيفات الرئيسية — اسحب تصنيفاً فرعياً وأفلته هنا لرفعه للمستوى الأول.'}
        </div>
        <ul className="divide-y divide-line/60">
          {flatCats.length === 0 && (
            <li className="py-6 text-center text-sm text-soft">
              لا توجد تصنيفات بعد — أضف أول تصنيف من الأعلى.
            </li>
          )}
          {flatCats.map((c) => {
            const n = (usage.category || {})[c.name_ar] || 0;
            const siblings = categorySiblings(draftCats, c.parent_id ?? null);
            const ix = siblings.findIndex((item) => item.id === c.id);
            const childCount = childrenCount[c.id] || 0;
            const isEditing = editCat?.id === c.id;
            const blockedParents = isEditing ? categorySubtreeIds(draftCats, c.id) : null;
            const moved = Boolean(pendingMoves[c.id]);
            return (
              <li
                key={c.id}
                draggable={!isEditing && !savingMoves && !busy}
                onDragStart={(e) => {
                  setDraggingId(c.id);
                  setDropTargetId(null);
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', c.id);
                }}
                onDragEnd={() => {
                  setDraggingId(null);
                  setDropTargetId(null);
                }}
                onDragOver={(e) => {
                  if (!canDropOn(c.id)) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dropTargetId !== c.id) setDropTargetId(c.id);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  dropOn(c.id);
                }}
                className={`-mx-2 rounded-lg px-2 py-2 transition ${
                  dropTargetId === c.id
                    ? 'bg-brand-pale ring-2 ring-inset ring-brand/50'
                    : moved
                      ? 'bg-amber-50/80'
                      : 'hover:bg-gray-50'
                } ${draggingId === c.id ? 'opacity-40' : ''}`}
                style={{ paddingInlineStart: `${(c.depth || 0) * 16 + 8}px` }}
              >
                <div className="flex items-center justify-between gap-2">
                  {isEditing ? (
                    <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                      <Input
                        value={editCat.name}
                        onChange={(e) => setEditCat((draft) => ({ ...draft, name: e.target.value }))}
                        className="min-w-[130px] flex-1"
                        aria-label="الاسم الجديد"
                      />
                      <Select
                        value={editCat.parentId || SELECT_ROOT}
                        onValueChange={(v) =>
                          setEditCat((draft) => ({ ...draft, parentId: v === SELECT_ROOT ? '' : v }))
                        }
                      >
                        <SelectTrigger className="min-w-[150px] bg-white" aria-label="التصنيف الأب">
                          <SelectValue placeholder="تصنيف رئيسي" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SELECT_ROOT}>تصنيف رئيسي (بدون أب)</SelectItem>
                          {flatCats
                            .filter((p) => !blockedParents?.has(p.id))
                            .map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {indent(p.depth)}
                                {p.name_ar}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" onClick={() => saveCatEdit(c)}>
                        حفظ
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditCat(null)}>
                        إلغاء
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span
                        className="flex h-9 w-5 shrink-0 cursor-grab items-center justify-center text-gray-400 active:cursor-grabbing"
                        title="اسحب لنقل التصنيف"
                        aria-hidden="true"
                      >
                        <GripVertical size={14} />
                      </span>
                      {c.depth > 0 && (
                        <span className="shrink-0 text-soft" aria-hidden="true">
                          ↳
                        </span>
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                        {c.name_ar}
                      </span>
                      {moved && (
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                          غير محفوظ
                        </span>
                      )}
                      {childCount > 0 && (
                        <span className="shrink-0 rounded-full bg-brand-pale px-2 py-0.5 text-[11px] font-bold tabular-nums text-brand">
                          {childCount} فرعي
                        </span>
                      )}
                      <UsagePill n={n} emptyLabel="غير مستعمل" />
                      <div className="flex shrink-0 items-center gap-0.5">
                        <MoveButtons
                          onUp={() => moveCat(c, -1)}
                          onDown={() => moveCat(c, 1)}
                          upDisabled={busy || hasPending || ix <= 0}
                          downDisabled={busy || hasPending || ix === siblings.length - 1}
                        />
                        <button
                          onClick={() => {
                            setCatParent(c.id);
                            focusAddForm();
                          }}
                          disabled={hasPending}
                          className="flex h-9 w-9 items-center justify-center rounded-md text-gray-500 transition hover:bg-brand-pale hover:text-brand disabled:pointer-events-none disabled:opacity-30"
                          title="إضافة تصنيف فرعي"
                          aria-label="إضافة تصنيف فرعي"
                        >
                          <IconPlus width={14} height={14} />
                        </button>
                        <button
                          onClick={() => {
                            setEditCat({ id: c.id, name: c.name_ar, parentId: c.parent_id || '' });
                          }}
                          disabled={hasPending}
                          className="flex h-9 w-9 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100 hover:text-brand disabled:pointer-events-none disabled:opacity-30"
                          title="إعادة تسمية أو نقل"
                          aria-label="إعادة تسمية أو نقل"
                        >
                          <IconEdit width={14} height={14} />
                        </button>
                        <button
                          onClick={() => askDeleteCat(c)}
                          disabled={hasPending}
                          className="flex h-9 w-9 items-center justify-center rounded-md text-gray-500 transition hover:bg-rose-50 hover:text-danger disabled:pointer-events-none disabled:opacity-30"
                          title="حذف"
                          aria-label="حذف"
                        >
                          <IconTrash width={14} height={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
                {deletingCatId === c.id && (
                  <ReassignDelete
                    itemLabel={c.name_ar}
                    usage={n}
                    options={cats.filter((x) => x.id !== c.id).map((x) => x.name_ar)}
                    note={
                      childCount > 0 ? `سيتم نقل ${childCount} تصنيف فرعي إلى التصنيف الأب قبل الحذف.` : ''
                    }
                    onConfirm={(to) => removeCat(c, to)}
                    onCancel={() => setDeletingCatId(null)}
                    busy={busy}
                  />
                )}
                {guardCatDelete && guardCatDelete.id === c.id && (
                  <GuardConfirm
                    text={`حذف تصنيف «${c.name_ar}» نهائياً؟ لا تستعمله أي كتب.`}
                    note={
                      childCount > 0 ? `سيتم نقل ${childCount} تصنيف فرعي إلى التصنيف الأب قبل الحذف.` : ''
                    }
                    confirmLabel="حذف"
                    busy={busy}
                    onCancel={() => setGuardCatDelete(null)}
                    onConfirm={() => {
                      const g = guardCatDelete;
                      setGuardCatDelete(null);
                      removeCat(g, null);
                    }}
                  />
                )}
                {guardCatRename && guardCatRename.cat.id === c.id && (
                  <GuardConfirm
                    text={`«${c.name_ar}» مستعمل في ${booksWord(n)} — سيتم تحديثها إلى «${guardCatRename.value}».`}
                    confirmLabel="تحديث الكتب"
                    busy={busy}
                    onCancel={() => setGuardCatRename(null)}
                    onConfirm={() =>
                      renameCat(guardCatRename.cat, guardCatRename.value, guardCatRename.parentId)
                    }
                  />
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Attributes */}
      <section className="card border border-line/70 p-5">
        <div className="mb-1 flex items-center gap-2">
          <h2 className="admin-section-title">خيارات الطبعة (التجليد / المقاس / الورق)</h2>
          <CountBadge n={totalAttrs} />
        </div>
        <p className="mb-4 text-xs text-soft">
          القيم التي يختار منها نموذج الكتاب. إعادة التسمية تُحدّث الكتب تلقائياً.
        </p>

        <div className="mb-4 grid gap-2 sm:grid-cols-3">
          {TYPES.map((t) => {
            const visible = !hiddenSpecs.includes(t);
            return (
              <div
                key={t}
                className="flex items-center justify-between gap-3 rounded-lg border border-line bg-gray-50 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink">{TYPE_LABEL[t]}</p>
                  <p
                    className={`mt-0.5 flex items-center gap-1 text-[11px] ${visible ? 'text-soft' : 'text-amber-700'}`}
                  >
                    {visible ? <Eye width={12} height={12} /> : <EyeOff width={12} height={12} />}
                    {visible ? 'ظاهر في صفحة الكتاب' : 'مخفي من صفحة الكتاب'}
                  </p>
                </div>
                <Switch
                  checked={visible}
                  disabled={savingSpec === t}
                  onCheckedChange={(checked) => toggleSpec(t, checked)}
                  aria-label={`إظهار ${TYPE_LABEL[t]} في صفحة الكتاب`}
                />
              </div>
            );
          })}
        </div>
        <p className="mb-4 text-[11px] leading-5 text-soft">
          هذا الإخفاء يخص صفحة الكتاب العامة فقط؛ نموذج إضافة الكتاب يبقى يعرض الحقول الثلاثة.
        </p>

        <Select value={activeType} onValueChange={setActiveType}>
          <SelectTrigger className="mb-4 max-w-xs" aria-label="نوع الخيارات">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {TYPE_LABEL[t]} ({(attrs[t] || []).length}){hiddenSpecs.includes(t) ? ' — مخفي' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <AttributeManager
          key={activeType}
          type={activeType}
          items={[...(attrs[activeType] || [])].sort((a, b) => a.sort - b.sort)}
          usage={usage[activeType] || {}}
          onReload={load}
        />
      </section>
    </div>
  );
}
