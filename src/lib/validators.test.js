import { describe, expect, it } from 'vitest';
import { isValidMaPhone, maskPhone, sanitizeTelHref, validateBook, validateOrder } from './validators';

describe('validateOrder', () => {
  const good = {
    name: 'محمد الأحمدي',
    phone: '0612345678',
    city: 'الدار البيضاء',
    address: 'حي المعاريف، شارع 12، رقم 5',
    notes: '',
  };

  it('accepts a valid Moroccan order', () => {
    expect(validateOrder(good)).toEqual({});
  });

  it('accepts +212 format with spaces/dashes', () => {
    expect(validateOrder({ ...good, phone: '+212 6-12 345678' })).toEqual({});
  });

  it('rejects non-Moroccan / garbage phones (incl. +++++++++++)', () => {
    for (const phone of ['+++++++++++', '123', '06123', '0033123456789', '', 'abcdefghij']) {
      expect(validateOrder({ ...good, phone }).phone).toBeTruthy();
    }
  });

  it('rejects short names, short addresses, long notes', () => {
    expect(validateOrder({ ...good, name: 'ab' }).name).toBeTruthy();
    expect(validateOrder({ ...good, address: 'short' }).address).toBeTruthy();
    expect(validateOrder({ ...good, notes: 'x'.repeat(1001) }).notes).toBeTruthy();
  });

  it('bounds city length', () => {
    expect(validateOrder({ ...good, city: 'x' }).city).toBeTruthy();
    expect(validateOrder({ ...good, city: '' })).toEqual({});
  });
});

describe('phone helpers', () => {
  it('masks middle digits', () => {
    expect(maskPhone('0612345678')).toBe('06•••5678');
  });

  it('sanitizes tel: hrefs', () => {
    expect(sanitizeTelHref('06 12-34 56 78')).toBe('tel:0612345678');
    expect(sanitizeTelHref('javascript:alert(1)')).toBe('tel:1');
  });

  it('validates MA mobiles only (05/06/07)', () => {
    expect(isValidMaPhone('0612345678')).toBe(true);
    expect(isValidMaPhone('0512345678')).toBe(true);
    expect(isValidMaPhone('0412345678')).toBe(false);
  });
});

describe('validateBook', () => {
  const good = {
    title_ar: 'الداء والدواء',
    category: 'الرقائق والأخلاق',
    price: '70',
    old_price: '',
    pages: '367',
    stock_qty: '10',
    isbn: '',
    cover_image: 'https://pub-xxx.r2.dev/covers/a.webp',
  };
  const opts = { categories: ['الرقائق والأخلاق'] };

  it('accepts a valid book', () => {
    expect(validateBook(good, opts)).toEqual({});
  });

  it('requires title and category (category must exist)', () => {
    expect(validateBook({ ...good, title_ar: '  ' }, opts).title_ar).toBeTruthy();
    expect(validateBook({ ...good, category: '' }, opts).category).toBeTruthy();
    expect(validateBook({ ...good, category: 'تصنيف وهمي' }, opts).category).toBeTruthy();
  });

  it('bounds price and old_price', () => {
    expect(validateBook({ ...good, price: '-5' }, opts).price).toBeTruthy();
    expect(validateBook({ ...good, price: 'abc' }, opts).price).toBeTruthy();
    expect(validateBook({ ...good, old_price: '50' }, opts).old_price).toBeTruthy();
  });

  it('rejects non-integer pages/stock (NaN guard)', () => {
    expect(validateBook({ ...good, pages: 'abc' }, opts).pages).toBeTruthy();
    expect(validateBook({ ...good, stock_qty: '1.5' }, opts).stock_qty).toBeTruthy();
    expect(validateBook({ ...good, stock_qty: '-1' }, opts).stock_qty).toBeTruthy();
  });

  it('validates ISBN only when present, and cover URL scheme', () => {
    expect(validateBook({ ...good, isbn: '12345' }, opts).isbn).toBeTruthy();
    expect(validateBook({ ...good, isbn: '9780131103627' }, opts)).toEqual({});
    expect(validateBook({ ...good, cover_image: 'http://evil.test/x.jpg' }, opts).cover_image).toBeTruthy();
  });
});
