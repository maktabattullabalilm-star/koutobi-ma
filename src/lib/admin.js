/**
 * Admin data layer — barrel (docs/backlog/21).
 * Domain modules live in `src/lib/admin/`; this file re-exports the full
 * public surface so existing imports keep working unchanged.
 */
export {
  ADMIN_PAGE_SIZE,
  adminCreateBook,
  adminDeleteBook,
  adminGetBooks,
  adminUpdateBook,
} from './admin/books';
export { deleteR2Object, uploadR2File } from './admin/storage';
export {
  adminCreateBookImage,
  adminDeleteBookImage,
  adminDeleteBookWithImages,
  adminGetBookImages,
  adminUpdateBookImage,
} from './admin/images';
export {
  adminCreateAttributeOption,
  adminCreateCategory,
  adminDeleteAttributeOption,
  adminDeleteCategory,
  adminGetAttributeOptions,
  adminGetCategories,
  adminPropagateRename,
  adminReassignBooks,
  adminReorderRows,
  adminUpdateAttributeOption,
  adminUpdateCategory,
  getAttributeOptionsForForm,
  getCategoriesForForm,
} from './admin/catalog';
export {
  canonicalAuthorName,
  canonicalPublisherName,
  directoryKey,
  ensureAuthor,
  ensurePublisher,
  getAuthorsForForm,
  getPublishersForForm,
} from './admin/directories';
export {
  adminAdjustStock,
  adminBulkStockIn,
  adminGetStockMovements,
  adminUpdateAppSetting,
  getAppSetting,
} from './admin/stock';
export { adminGetOrders, adminStats, adminUpdateOrderStatus } from './admin/orders';
