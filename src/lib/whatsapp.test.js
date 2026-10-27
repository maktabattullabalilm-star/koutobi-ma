import { describe, expect, it } from 'vitest';
import {
  adminOrderFollowupLink,
  checkoutOrderLink,
  generalInquiryLink,
  thankYouConfirmLink,
} from './whatsapp';

const NUMBER = '212600000000';

describe('whatsapp builders (backlog 22)', () => {
  it('builds encoded wa.me links from the DB number', () => {
    const link = generalInquiryLink('book', NUMBER);
    expect(link.startsWith(`https://wa.me/${NUMBER}?text=`)).toBe(true);
    expect(link).toContain(encodeURIComponent('أريد طلب كتاب'));
  });

  it('returns null when the store has no number', () => {
    expect(generalInquiryLink('book')).toBeNull();
    expect(checkoutOrderLink({ items: [], total: 0 })).toBeNull();
    expect(thankYouConfirmLink({ orderId: 'x' })).toBeNull();
  });

  it('renders checkout summaries with items + total', () => {
    const link = checkoutOrderLink(
      {
        items: [{ title: 'حصن المسلم', price: 15, qty: 2 }],
        total: 30,
        name: 'أم يوسف',
        phone: '0612345678',
        address: 'الدار البيضاء',
      },
      NUMBER
    );
    const text = decodeURIComponent(link.split('text=')[1]);
    expect(text).toContain('حصن المسلم');
    expect(text).toContain('0612345678');
  });

  it('renders thank-you confirmations and admin follow-ups', () => {
    expect(
      decodeURIComponent(
        thankYouConfirmLink({ orderId: 'abc', name: 'ن', phone: '06' }, NUMBER).split('text=')[1]
      )
    ).toContain('abc');
    const admin = adminOrderFollowupLink(
      {
        customer_name: 'كريم',
        total: 70,
        order_items: [{ title_ar: 'الداء والدواء', quantity: 1 }],
      },
      NUMBER
    );
    expect(decodeURIComponent(admin.split('text=')[1])).toContain('الداء والدواء');
  });
});
