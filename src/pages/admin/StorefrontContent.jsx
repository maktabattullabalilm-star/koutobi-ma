import { useEffect, useState } from 'react';
import {
  ExternalLink,
  Eye,
  EyeOff,
  GripVertical,
  LayoutTemplate,
  Megaphone,
  Monitor,
  Palette,
  Plus,
  Save,
  Star,
  Trash2,
} from 'lucide-react';
import { adminSaveStorefrontContent, getStorefrontContent } from '../../lib/storefrontContent';
import { normalizeHeroSlides, validateHeroContent } from '../../lib/hero';
import { verifySocialUrl } from '../../lib/socialLinks';
import { verifyEmail } from '../../lib/email';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/admin/PageHeader';
import HeroEditor from '../../components/admin/HeroEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

const PAGES = [
  {
    label: 'الصفحة الرئيسية',
    icon: LayoutTemplate,
    keys: [
      'home_hero',
      'home_categories',
      'home_newest',
      'home_featured',
      'home_how',
      'home_features',
      'home_testimonials',
      'home_cta',
    ],
  },
  { label: 'صفحة المنتج', icon: Monitor, keys: ['product_page'] },
  { label: 'عناصر عامة', icon: Megaphone, keys: ['announcement', 'footer'] },
  { label: 'هوية المتجر', icon: Palette, keys: ['brand'] },
];

const META = {
  home_hero: {
    title: 'واجهة الصفحة',
    hint: 'شرائح متعددة تتبدّل تلقائياً: النصوص والألوان والكتب المختارة لكل شريحة.',
  },
  home_categories: { title: 'التصنيفات الشائعة', hint: 'العنوان والوصف فوق بطاقات التصنيفات.' },
  home_newest: { title: 'أحدث الإصدارات', hint: 'عنوان ووصف قسم الكتب الجديدة.' },
  home_featured: { title: 'الأكثر مبيعاً', hint: 'عنوان ووصف قسم الكتب المميزة.' },
  home_how: { title: 'كيف أطلب؟', hint: 'عنوان القسم والخطوات الثلاث التي تشرح الشراء.' },
  home_features: { title: 'مزايا المتجر', hint: 'البطاقات الأربع: الدفع، التوصيل، الكتب، والدعم.' },
  home_testimonials: {
    title: 'آراء العملاء',
    hint: 'أضف آراء العملاء مع التقييم وشارة الشراء الموثّق. فعّل «القسم ظاهر للزوار» ليظهر في الصفحة الرئيسية.',
  },
  home_cta: { title: 'الدعوة الأخيرة', hint: 'الكتلة الخضراء في أسفل الصفحة الرئيسية.' },
  product_page: { title: 'صفحة المنتج', hint: 'الأزرار والعناوين والرسائل الثابتة بجانب كل كتاب.' },
  announcement: { title: 'الشريط العلوي', hint: 'الرسائل المتحركة أعلى جميع صفحات المتجر.' },
  footer: { title: 'التذييل', hint: 'قسم التواصل والنبذة في أسفل جميع الصفحات.' },
  brand: {
    title: 'الشعار والألوان وروابط التواصل',
    hint: 'غيّر هوية المتجر وروابط حساباتك الاجتماعية وبريد التواصل. تظهر في أسفل المتجر.',
  },
};

const FIELD_LABELS = {
  badge: 'النص القصير فوق العنوان',
  title: 'العنوان',
  description: 'الوصف',
  shop_label: 'نص زر التسوق',
  how_label: 'نص زر كيف أطلب',
  link_label: 'رابط عرض الكل',
  whatsapp_label: 'نص زر واتساب',
  note: 'النص الصغير أسفل الأزرار',
  price_badge: 'شارة السعر',
  tax_note: 'ملاحظة السعر والتوصيل',
  add_label: 'زر أضف للسلة',
  buy_label: 'زر اطلب الآن',
  support: 'رسالة الدعم',
  details_title: 'عنوان التفاصيل',
  specs_title: 'عنوان بيانات الطبعة',
  related_title: 'عنوان الكتب المشابهة',
  contact_title: 'عنوان التواصل',
  contact_description: 'وصف التواصل',
  about: 'نبذة عن المتجر',
  logo_url: 'رابط صورة الشعار',
  logo_name: 'اسم المتجر',
  logo_mark: 'الحرف داخل الشعار',
  logo_suffix: 'اللاحقة بجانب الاسم',
};

function isLong(name, value) {
  return /description|support|about|note|tax|text/.test(name) || String(value || '').length > 70;
}

function CopyField({ name, value, onChange }) {
  const isUrl = name === 'logo_url';
  const props = {
    value: value || '',
    dir: isUrl ? 'ltr' : 'rtl',
    onChange: (event) => onChange(event.target.value),
    className: `mt-1.5 bg-white ${isUrl ? 'text-left' : ''}`,
  };
  return (
    <label className="block">
      <span className="text-sm font-semibold text-ink">{FIELD_LABELS[name] || name}</span>
      {isLong(name, value) ? <Textarea {...props} rows={3} /> : <Input {...props} />}
    </label>
  );
}

function itemSchema(sectionKey, listKey) {
  if (listKey === 'stats')
    return [
      ['value', 'الرقم أو القيمة'],
      ['label', 'الوصف'],
    ];
  if (listKey === 'messages') return [['message', 'الرسالة']];
  if (sectionKey === 'home_testimonials')
    return [
      ['name', 'اسم العميل'],
      ['rating', 'التقييم'],
      ['text', 'نص الرأي'],
      ['verified', 'شراء موثّق'],
    ];
  return [
    ['title', 'العنوان'],
    ['description', 'الوصف'],
  ];
}

function emptyItem(sectionKey, schema) {
  if (sectionKey === 'home_testimonials') return { name: '', rating: 5, text: '', verified: false };
  return Object.fromEntries(schema.map(([key]) => [key, '']));
}

function RatingPicker({ value, onChange }) {
  const rating = Math.min(5, Math.max(1, Number(value) || 5));
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1" role="group" aria-label="التقييم">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          aria-label={`${star} من 5`}
          aria-pressed={rating === star}
          onClick={() => onChange(star)}
          className="rounded p-0.5 transition hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <Star
            size={22}
            aria-hidden="true"
            className={star <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}
          />
        </button>
      ))}
      <span className="ms-1 text-xs font-bold text-soft">{rating} من 5</span>
    </div>
  );
}

function ListEditor({ sectionKey, listKey, value, onChange }) {
  const schema = itemSchema(sectionKey, listKey);
  const items = listKey === 'messages' ? value.map((message) => ({ message })) : value;
  const update = (next) => onChange(listKey === 'messages' ? next.map((item) => item.message) : next);
  const title = {
    stats: 'الأرقام الظاهرة',
    items: sectionKey === 'home_testimonials' ? 'آراء العملاء' : 'البطاقات الظاهرة',
    messages: 'رسائل الشريط',
  }[listKey];
  return (
    <div className="rounded-lg border border-line bg-gray-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-ink">{title}</h3>
          <p className="mt-0.5 text-xs text-soft">اسحب الترتيب بالأسهم أو أضف واحذف العناصر.</p>
        </div>
        <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-soft">{items.length}</span>
      </div>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="rounded-md border border-line bg-white p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold text-soft">
              <GripVertical size={16} /> عنصر {index + 1}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {schema.map(([key, label]) => {
                if (key === 'rating') {
                  return (
                    <div key={key}>
                      <span className="text-xs font-semibold text-soft">{label}</span>
                      <RatingPicker
                        value={item.rating}
                        onChange={(rating) => {
                          const next = [...items];
                          next[index] = { ...item, rating };
                          update(next);
                        }}
                      />
                    </div>
                  );
                }
                if (key === 'verified') {
                  return (
                    <div key={key} className="flex items-center gap-2 pt-5">
                      <Switch
                        id={`testimonial-verified-${index}`}
                        aria-label={label}
                        checked={Boolean(item.verified)}
                        onCheckedChange={(verified) => {
                          const next = [...items];
                          next[index] = { ...item, verified };
                          update(next);
                        }}
                      />
                      <label
                        htmlFor={`testimonial-verified-${index}`}
                        className="cursor-pointer text-sm font-semibold text-ink"
                      >
                        {label}
                      </label>
                    </div>
                  );
                }
                return (
                  <label key={key} className={key === 'text' || key === 'description' ? 'sm:col-span-2' : ''}>
                    <span className="text-xs font-semibold text-soft">{label}</span>
                    {isLong(key, item[key]) ? (
                      <Textarea
                        dir={listKey === 'stats' && key === 'value' ? 'ltr' : 'rtl'}
                        value={item[key] || ''}
                        onChange={(e) => {
                          const next = [...items];
                          next[index] = { ...item, [key]: e.target.value };
                          update(next);
                        }}
                        rows={3}
                        className="mt-1 bg-gray-50"
                      />
                    ) : (
                      <Input
                        dir={listKey === 'stats' && key === 'value' ? 'ltr' : 'rtl'}
                        value={item[key] || ''}
                        onChange={(e) => {
                          const next = [...items];
                          next[index] = { ...item, [key]: e.target.value };
                          update(next);
                        }}
                        className="mt-1 bg-gray-50"
                      />
                    )}
                  </label>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-1 border-t border-line pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={index === 0}
                onClick={() => {
                  const next = [...items];
                  [next[index - 1], next[index]] = [next[index], next[index - 1]];
                  update(next);
                }}
              >
                تحريك لأعلى
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={index === items.length - 1}
                onClick={() => {
                  const next = [...items];
                  [next[index], next[index + 1]] = [next[index + 1], next[index]];
                  update(next);
                }}
              >
                تحريك لأسفل
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ms-auto text-danger hover:text-danger"
                onClick={() => update(items.filter((_, i) => i !== index))}
              >
                <Trash2 size={15} /> حذف
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={() => update([...items, emptyItem(sectionKey, schema)])}
      >
        <Plus size={15} /> إضافة عنصر
      </Button>
    </div>
  );
}

function BrandEditor({ brand, onChange }) {
  const set = (key, value) => onChange({ ...brand, [key]: value });
  const socials = brand.socials || [];
  const emailCheck = verifyEmail(brand.contact_email);
  const socialErrors = socials.map((social) => verifySocialUrl(social.network, social.url));
  const hasSocialErrors = socialErrors.some((result) => !result.valid);
  const updateSocial = (index, key, value) =>
    set(
      'socials',
      socials.map((social, i) => (i === index ? { ...social, [key]: value } : social))
    );
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-brand/20 bg-brand-pale/50 p-4">
        <h3 className="font-bold text-ink">الشعار</h3>
        <p className="mt-1 text-xs leading-5 text-soft">
          أدخل رابط صورة الشعار، أو اتركه فارغاً لاستخدام المربع والحرف. يفضّل صورة مربعة شفافة.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <CopyField name="logo_url" value={brand.logo_url} onChange={(value) => set('logo_url', value)} />
          <CopyField name="logo_name" value={brand.logo_name} onChange={(value) => set('logo_name', value)} />
          <CopyField name="logo_mark" value={brand.logo_mark} onChange={(value) => set('logo_mark', value)} />
          <CopyField
            name="logo_suffix"
            value={brand.logo_suffix}
            onChange={(value) => set('logo_suffix', value)}
          />
        </div>
      </div>
      <div className="rounded-lg border border-line bg-gray-50 p-4">
        <h3 className="font-bold text-ink">ألوان الهوية</h3>
        <p className="mt-1 text-xs leading-5 text-soft">
          هذه الألوان تغيّر لون الأزرار والعناوين والخلفيات الخضراء في المتجر.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            ['primary_color', 'اللون الرئيسي'],
            ['primary_dark', 'الرئيسي الداكن'],
            ['primary_darker', 'الرئيسي الأغمق'],
            ['primary_light', 'الخلفية الفاتحة'],
            ['primary_pale', 'الخلفية الشاحبة'],
          ].map(([key, label]) => (
            <label key={key} className="rounded-md border border-line bg-white p-3">
              <span className="text-sm font-semibold text-ink">{label}</span>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="color"
                  value={brand[key] || '#35724e'}
                  onChange={(event) => set(key, event.target.value)}
                  className="h-9 w-11 cursor-pointer rounded border border-line bg-white p-1"
                  aria-label={label}
                />
                <Input
                  dir="ltr"
                  value={brand[key] || ''}
                  onChange={(event) => set(key, event.target.value)}
                  className="font-mono text-left"
                />
              </div>
            </label>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-line bg-gray-50 p-4">
        <h3 className="font-bold text-ink">روابط مواقع التواصل</h3>
        <p className="mt-1 text-xs leading-5 text-soft">
          أدخل رابط HTTPS كاملاً ومن نطاق المنصة نفسها للحسابات المعروفة. الرابط الفارغ يخفي الأيقونة.
        </p>
        <div className="mt-4 rounded-md border border-line bg-white p-3">
          <label className="block">
            <span className="text-sm font-semibold text-ink">البريد الإلكتروني للتواصل</span>
            <Input
              dir="ltr"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={brand.contact_email || ''}
              onChange={(event) => set('contact_email', event.target.value)}
              className="mt-1.5 text-left"
              aria-label="البريد الإلكتروني للتواصل"
            />
            <span
              className={`mt-1.5 block text-xs font-medium ${emailCheck.valid ? 'text-soft' : 'text-danger'}`}
            >
              {emailCheck.valid
                ? 'يظهر في تذييل المتجر ضمن «تواصل معنا». اتركه فارغاً لإخفائه.'
                : emailCheck.message}
            </span>
          </label>
        </div>
        <div className="mt-4 space-y-3">
          {socials.map((social, index) => {
            const verification = socialErrors[index];
            return (
              <div
                key={`${social.network}-${index}`}
                className={`rounded-md border bg-white p-3 ${verification.valid ? 'border-line' : 'border-danger/50'}`}
              >
                <div className="grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)_auto]">
                  <Input
                    value={social.network}
                    onChange={(event) => updateSocial(index, 'network', event.target.value)}
                    className="font-bold"
                    aria-label="اسم المنصة"
                  />
                  <Input
                    dir="ltr"
                    type="url"
                    placeholder="https://..."
                    value={social.url}
                    onChange={(event) => updateSocial(index, 'url', event.target.value)}
                    className="text-left"
                    aria-label={`رابط ${social.network}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-danger"
                    onClick={() =>
                      set(
                        'socials',
                        socials.filter((_, i) => i !== index)
                      )
                    }
                    aria-label={`حذف ${social.network}`}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
                {verification.valid ? (
                  <p className="mt-2 text-xs font-medium text-emerald-700">
                    {verification.empty ? 'لن تظهر الأيقونة حتى تضيف رابطاً.' : '✓ رابط آمن وصالح'}
                  </p>
                ) : (
                  <p role="alert" className="mt-2 text-xs font-medium text-danger">
                    {verification.message}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => set('socials', [...socials, { network: 'رابط جديد', url: '' }])}
        >
          <Plus size={15} /> إضافة رابط آخر
        </Button>
        {hasSocialErrors && (
          <p className="mt-2 text-xs text-danger">صحّح روابط التواصل غير الصالحة قبل الحفظ.</p>
        )}
      </div>
    </div>
  );
}

export default function StorefrontContent({ initialSection = '' }) {
  const { show } = useToast();
  const [sections, setSections] = useState(null);
  const initialPageIndex = Math.max(
    0,
    PAGES.findIndex((item) => item.keys.includes(initialSection))
  );
  const [pageIndex, setPageIndex] = useState(initialPageIndex);
  const [activeKey, setActiveKey] = useState(initialSection || PAGES[initialPageIndex].keys[0]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    getStorefrontContent().then(setSections);
  }, []);
  if (!sections) return <div className="py-16 text-center text-sm text-soft">جارٍ تحميل محتوى المتجر…</div>;

  const isReviewsPage = initialSection === 'home_testimonials' && activeKey === 'home_testimonials';
  const page = PAGES[pageIndex];
  const section = sections[activeKey];
  const meta = META[activeKey];
  const change = (patch) =>
    setSections((current) => ({ ...current, [activeKey]: { ...current[activeKey], ...patch } }));
  const changeContent = (name, value) => change({ content: { ...section.content, [name]: value } });
  const selectPage = (index) => {
    setPageIndex(index);
    setActiveKey(PAGES[index].keys[0]);
  };
  const save = async () => {
    if (activeKey === 'home_hero') {
      const heroError = validateHeroContent(section.content);
      if (heroError) {
        show(heroError, 'error');
        return;
      }
    }
    if (activeKey === 'brand') {
      const emailCheck = verifyEmail(section.content.contact_email);
      if (!emailCheck.valid) {
        show(emailCheck.message, 'error');
        return;
      }
      if (
        (section.content.socials || []).some((social) => !verifySocialUrl(social.network, social.url).valid)
      ) {
        show('تحقق من روابط التواصل غير الصالحة قبل الحفظ', 'error');
        return;
      }
    }
    setSaving(true);
    try {
      const payload =
        activeKey === 'home_hero' ? { slides: normalizeHeroSlides(section.content) } : section.content;
      await adminSaveStorefrontContent(activeKey, payload, section.visible);
      show('تم حفظ هذا القسم — التغيير ظاهر في المتجر الآن ✓');
    } catch (error) {
      show(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={isReviewsPage ? 'آراء العملاء' : 'محتوى المتجر'}
        description={
          isReviewsPage
            ? 'أضف آراء العملاء وعدّلها، ثم فعّل ظهور القسم في الصفحة الرئيسية.'
            : 'اختر مكاناً في المتجر، عدّل النصوص الظاهرة فيه، ثم احفظ.'
        }
        crumbs={[
          { label: 'لوحة التحكم', to: '/admin/dashboard' },
          ...(isReviewsPage ? [{ label: 'آراء العملاء' }] : [{ label: 'محتوى المتجر' }]),
        ]}
        actions={
          <Button asChild variant="outline">
            <a href="/" target="_blank" rel="noreferrer noopener">
              <ExternalLink size={16} /> معاينة المتجر
            </a>
          </Button>
        }
      />
      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
        <div className="border-b border-line bg-brand-pale/50 p-4">
          <p className="text-xs font-bold tracking-wide text-brand">خريطة المحتوى</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {PAGES.map((item, index) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.label}
                  variant={index === pageIndex ? 'default' : 'outline'}
                  onClick={() => selectPage(index)}
                >
                  <Icon size={16} /> {item.label}
                </Button>
              );
            })}
          </div>
        </div>
        <div className="grid lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="border-b border-line bg-gray-50/70 p-3 lg:border-b-0 lg:border-e">
            {page.keys.map((key) => {
              const item = sections[key];
              const active = key === activeKey;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveKey(key)}
                  className={`mb-1 w-full rounded-lg p-3 text-start transition ${active ? 'bg-white shadow-sm ring-1 ring-brand/20' : 'hover:bg-white'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm font-bold ${active ? 'text-brand' : 'text-ink'}`}>
                      {META[key].title}
                    </span>
                    {item.visible ? (
                      <Eye size={15} className="text-brand" />
                    ) : (
                      <EyeOff size={15} className="text-soft" />
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-soft">{META[key].hint}</p>
                </button>
              );
            })}
          </aside>
          <section className="min-w-0 p-5 sm:p-7">
            <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold tracking-wide text-brand">{page.label}</p>
                <h2 className="mt-1 font-display text-2xl font-bold text-ink">{meta.title}</h2>
                <p className="mt-1 max-w-xl text-sm leading-6 text-soft">{meta.hint}</p>
              </div>
              {activeKey !== 'brand' && (
                <div className="flex items-center gap-2 rounded-lg border border-line bg-gray-50 px-3 py-2">
                  <Switch
                    checked={section.visible}
                    onCheckedChange={(visible) => change({ visible })}
                    id="section-visible"
                  />
                  <label htmlFor="section-visible" className="cursor-pointer text-sm font-semibold text-ink">
                    {section.visible ? 'القسم ظاهر للزوار' : 'القسم مخفي عن الزوار'}
                  </label>
                </div>
              )}
            </div>
            <div className="mt-6 space-y-5">
              {activeKey === 'brand' ? (
                <BrandEditor brand={section.content} onChange={(content) => change({ content })} />
              ) : activeKey === 'home_hero' ? (
                <HeroEditor content={section.content} onChange={(content) => change({ content })} />
              ) : (
                <>
                  {Object.entries(section.content)
                    .filter(([key]) => !['items', 'stats', 'messages'].includes(key))
                    .map(([key, value]) => (
                      <CopyField
                        key={key}
                        name={key}
                        value={value}
                        onChange={(value) => changeContent(key, value)}
                      />
                    ))}
                  {['stats', 'items', 'messages']
                    .filter((key) => Array.isArray(section.content[key]))
                    .map((key) => (
                      <ListEditor
                        key={key}
                        sectionKey={activeKey}
                        listKey={key}
                        value={section.content[key]}
                        onChange={(value) => changeContent(key, value)}
                      />
                    ))}
                </>
              )}
            </div>
            <div className="sticky bottom-0 -mx-5 mt-8 border-t border-line bg-white/95 px-5 py-4 backdrop-blur sm:-mx-7 sm:px-7">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-soft">التغييرات غير منشورة حتى تضغط حفظ.</p>
                <Button onClick={save} disabled={saving}>
                  <Save size={16} /> {saving ? 'جارٍ الحفظ…' : 'حفظ هذا القسم'}
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
