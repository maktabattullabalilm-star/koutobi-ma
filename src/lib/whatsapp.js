import { formatPrice } from './format';
import { whatsappLink } from './config';

/**
 * Single home for every WhatsApp message template (docs/backlog/22).
 * All links go through `whatsappLink` (encoding-safe).
 */

export function generalInquiryLink(kind = 'question', numberOverride) {
  // Back-compat: generalInquiryLink(number) treats a digits-like first arg as the override.
  if (typeof kind === 'string' && /[0-9+][0-9+\s-]{7,}/.test(kind) && !['question', 'book', 'search', 'order'].includes(kind)) {
    numberOverride = kind;
    kind = 'question';
  }
  const msg =
    kind === 'book'
      ? 'السلام عليكم، أريد طلب كتاب من مكتبة كُتُبِي 📚'
      : kind === 'search'
        ? 'السلام عليكم، أبحث عن كتاب معيّن 📚'
        : kind === 'order'
          ? 'السلام عليكم، أريد الاستفسار عن الطلب 🛒'
          : 'السلام عليكم، لديّ سؤال حول متجر كُتُبِي 🌱';
  return whatsappLink(msg, numberOverride);
}

export function checkoutOrderLink(
  { items = [], total = 0, name = '', phone = '', address = '' },
  numberOverride
) {
  return whatsappLink(
    `السلام عليكم، أريد تأكيد الطلب التالي:\n${items.map((it) => `• ${it.title} (×${it.qty}) — ${formatPrice(it.price * it.qty)}`).join('\n')}\nالإجمالي: ${formatPrice(total)}\nالاسم: ${name}\nالهاتف: ${phone}\nالعنوان: ${address}`,
    numberOverride
  );
}

export function thankYouConfirmLink({ orderId = '', name = '', phone = '' }, numberOverride) {
  return whatsappLink(
    `السلام عليكم، أؤكد طلبي رقم ${orderId || ''} ${name ? `باسم ${name}` : ''} ${phone ? `(${phone})` : ''}.`,
    numberOverride
  );
}

export function adminOrderFollowupLink(order, numberOverride) {
  const items = (order.order_items || []).map((it) => `• ${it.title_ar} (×${it.quantity})`).join('\n');
  return whatsappLink(
    `السلام عليكم ${order.customer_name} 🌱، بخصوص طلبكم من مكتبة كُتُبِي.ما:\n${items}\nالإجمالي: ${formatPrice(order.total)}`,
    numberOverride
  );
}

export function orderWhatsApp(order) {
  return adminOrderFollowupLink(order);
}
