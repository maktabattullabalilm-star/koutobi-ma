import { describe, expect, it } from 'vitest';
import {
  adminOrderFollowupLink,
  checkoutOrderLink,
  generalInquiryLink,
  thankYouConfirmLink,
} from './whatsapp';

describe('whatsapp builders (docs/backlog/22)', () => {
  it('builds encoded wa.me links', () => {
    const link = generalInquiryLink('book');
    expect(link.startsWith('https://wa.me/212624182004?text=')).toBe(true);
    expect(link).toContain(encodeURIComponent('أريد طلب كتاب'));
  });

  it('renders checkout summaries with items + total', () => {
    const link = checkoutOrderLink({
      items: [{ title: 'حصن المسلم', price: 15, qty: 2 }],
      total: 30,
      name: 'أم يوسف',
      phone: '0612345678',
      address: 'الدار البيضاء',
    });
    const text = decodeURIComponent(link.split('text=')[1]);
    expect(text).toContain('حصن المسلم');
    expect(text).toContain('0612345678');
  });

  it('renders thank-you confirmations and admin follow-ups', () => {
    expect(
      decodeURIComponent(thankYouConfirmLink({ orderId: 'abc', name: 'ن', phone: '06' }).split('text=')[1])
    ).toContain('abc');
    const admin = adminOrderFollowupLink({
      customer_name: 'كريم',
      total: 70,
      order_items: [{ title_ar: 'الداء والدواء', quantity: 1 }],
    });
    expect(decodeURIComponent(admin.split('text=')[1])).toContain('الداء والدواء');
  });
});
