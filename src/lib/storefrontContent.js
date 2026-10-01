import { supabase } from './supabase';

export const CONTENT_DEFAULTS = {
  home_hero: { badge: '📚 كتب عربية أصيلة — بأسعار مناسبة', title: 'مكتبة الكتب الإسلامية\nفي خدمتكم من قلب المغرب', description: 'اختر كتابك المفضّل، أرسل اسمك وهاتفك وعنوانك، وسنتصل بك لتأكيد الطلب وتوصيله إلى باب منزلك. الدفع عند الاستلام — بدون بطاقة بنكية.', shop_label: 'تسوّق الكتب', how_label: 'كيف أطلب؟', stats: [{ value: '100%', label: 'دفع عند الاستلام' }, { value: '+500', label: 'عنوان رقمي مختار' }, { value: '24/7', label: 'دعم عبر واتساب' }] },
  home_categories: { title: 'تصنيفات شائعة', description: 'اختر تصنيفك المفضّل لاستكشاف الكتب', link_label: 'عرض الكل ←' },
  home_newest: { title: 'أحدث الإصدارات', description: 'جديدنا الذي وصل حديثاً إلى المكتبة', link_label: 'عرض الكل ←' },
  home_featured: { title: 'الكتب الأكثر مبيعاً', description: 'تشكيلة مميّزة يفضّلها طلاب العلم', link_label: 'عرض الكل ←' },
  home_how: { title: 'كيف أطلب من كُتُبِي؟', description: 'طريقة الطلب بسيطة جداً ولا تتطلب حساباً أو بطاقة بنكية — الدفع عند الاستلام.', items: [{ title: 'اختر كتبك', description: 'أضف الكتب إلى السلة من صفحات المتجر، ثم انتقل إلى إتمام الطلب.' }, { title: 'أدخل بياناتك', description: 'أرسل اسمك، رقم هاتفك، وعنوان التوصيل في صفحة الطلب.' }, { title: 'نقوم بالباقي', description: 'سنتصل بك لتأكيد الطلب، وتوصيله إلى باب منزلك — تدفع عند الاستلام.' }] },
  home_features: { items: [{ title: 'الدفع عند الاستلام', description: 'ادفع عند استلام كتابك' }, { title: 'توصيل سريع', description: 'لجميع المدن المغربية' }, { title: 'كتب مختارة', description: 'جودة وأصالة المتحقق' }, { title: 'دعم واتساب', description: 'نجيب على استفساراتك' }] },
  home_testimonials: { title: 'آراء عملائنا', items: [{ name: 'أم يوسف — الدار البيضاء', text: 'طلبت كتابين، وكّلتهم بجودة التغليف والتوصيل. وصلنا في يومين والدفع عند الاستلام ريّحني كثيراً.', book: 'حصن المسلم' }, { name: 'محمد — مراكش', text: 'تجربة ممتازة، تواصلوا معي هاتفياً لتأكيد الطلب كما وعدوا. الكتب أصلية والمصاريف واضحة.', book: 'تيسير الكريم الرحمن' }, { name: 'أبوعبدالله — فاس', text: 'أفضل ما يميزهم الردّ السريع على واتساب والأسعار المعقولة. نصحني الأخ أن أخد «الداء والدواء» ولم أندم.', book: 'الداء والدواء' }] },
  home_cta: { title: 'جاهز لاقتناء كتابك المفضّل؟', description: 'تصفّح المكتبة، اختر كتبك، وأرسل بياناتك — وسنتواصل معك لتأكيد الطلب.', shop_label: 'تصفّح المكتبة', whatsapp_label: 'اطلب عبر واتساب', note: 'أو تواصل معنا مباشرة للاستفسار عن الكتب وتوفرها' },
  product_page: { price_badge: 'الدفع عند الاستلام', tax_note: 'الضريبة مضمنة في السعر · التوصيل يُحسب عند تأكيد الطلب هاتفياً.', add_label: 'أضف للسلة', buy_label: 'اطلب الآن', support: 'عند إتمام طلبك، سيتواصل معك فريقنا هاتفياً لتأكيد العنوان والدفع عند الاستلام.', details_title: 'التفاصيل', specs_title: 'بيانات الطبعة', related_title: 'كتب قد تعجبك أيضاً' },
  footer: { contact_title: 'خدمة العملاء متواجدة لمساعدتكم', contact_description: 'اطلب عبر الموقع وسنتصل بك لتأكيد الطلب والتوصيل.', about: 'مكتبة إسلامية متخصصة في الكتب العربية الأصيلة. نوصل الكتب إلى باب منزلك والدفع عند الاستلام.' },
  announcement: { messages: ['📦 توصيل سريع لجميع المدن المغربية', '💳 الدفع عند الاستلام — بلا مخاطرة', '💬 اطلب عبر واتساب بسهولة'] },
  brand: { logo_url: '', logo_mark: 'ك', logo_name: 'كُتُبِي', logo_suffix: '.ما', primary_color: '#35724e', primary_dark: '#2b5c40', primary_darker: '#234b35', primary_light: '#e8f2ec', primary_pale: '#f4f9f5', socials: [{ network: 'Facebook', url: '' }, { network: 'Instagram', url: '' }, { network: 'TikTok', url: '' }, { network: 'X', url: '' }, { network: 'YouTube', url: '' }] },
};

export async function getStorefrontContent() {
  if (!supabase) return Object.fromEntries(Object.entries(CONTENT_DEFAULTS).map(([key, content]) => [key, { content, visible: true }]));
  try {
    const { data, error } = await supabase.from('storefront_content').select('key,content,visible');
    if (error) throw error;
    const rows = Object.fromEntries((data || []).map((row) => [row.key, row]));
    return Object.fromEntries(Object.entries(CONTENT_DEFAULTS).map(([key, fallback]) => [key, { content: { ...fallback, ...(rows[key]?.content || {}) }, visible: rows[key]?.visible ?? true }]));
  } catch {
    return Object.fromEntries(Object.entries(CONTENT_DEFAULTS).map(([key, content]) => [key, { content, visible: true }]));
  }
}

export async function adminSaveStorefrontContent(key, content, visible) {
  const { error } = await supabase.from('storefront_content').upsert({ key, content, visible, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw new Error(error.message || 'تعذّر حفظ المحتوى');
}
