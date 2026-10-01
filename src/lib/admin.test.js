import { describe, expect, it } from 'vitest';
import * as admin from './admin';

const EXPECTED = [
  'ADMIN_PAGE_SIZE',
  'adminCreateBook',
  'adminDeleteBook',
  'adminGetBooks',
  'adminUpdateBook',
  'deleteR2Object',
  'uploadR2File',
  'adminCreateBookImage',
  'adminDeleteBookImage',
  'adminDeleteBookWithImages',
  'adminGetBookImages',
  'adminUpdateBookImage',
  'adminCreateAttributeOption',
  'adminCreateCategory',
  'adminDeleteAttributeOption',
  'adminDeleteCategory',
  'adminGetAttributeOptions',
  'adminGetCategories',
  'adminPropagateRename',
  'adminReassignBooks',
  'adminReorderRows',
  'adminUpdateAttributeOption',
  'adminUpdateCategory',
  'getAttributeOptionsForForm',
  'getCategoriesForForm',
  'canonicalAuthorName',
  'canonicalPublisherName',
  'directoryKey',
  'ensureAuthor',
  'ensurePublisher',
  'getAuthorsForForm',
  'getPublishersForForm',
  'adminAdjustStock',
  'adminBulkStockIn',
  'adminGetStockMovements',
  'adminUpdateAppSetting',
  'getAppSetting',
  'adminGetOrders',
  'adminStats',
  'adminUpdateOrderStatus',
];

describe('admin barrel (docs/backlog/21)', () => {
  it('re-exports the full domain surface (no missing barrel entries)', () => {
    for (const name of EXPECTED) {
      expect(typeof admin[name] !== 'undefined', name).toBe(true);
    }
  });
});
