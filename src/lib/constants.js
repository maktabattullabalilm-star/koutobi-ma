/** Shared domain constants — single source of truth (see docs/backlog/22). */

export const PASSWORD_MIN = 12;

export const CART_MAX_QTY = 99;

export const LOW_STOCK_AT = 5;

export const R2_PREFIX = 'covers/';

export const STORAGE_KEYS = {
  cart: 'koutobi_cart_v2',
  cartLegacy: 'koutobi_cart_v1',
  lastOrder: 'koutobi_last_order',
};

export const CART_STORAGE_VERSION = 2;

export const ORDER_STATUS = {
  new: { label: 'جديد', tone: 'amber' },
  contacted: { label: 'تم الاتصال', tone: 'blue' },
  delivered: { label: 'تم التوصيل', tone: 'green' },
  cancelled: { label: 'ملغي', tone: 'rose' },
};
