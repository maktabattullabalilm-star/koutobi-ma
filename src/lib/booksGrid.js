import { parseBooksPerRow } from './siteSettings';

/**
 * Full class strings (not interpolated) so Tailwind keeps every variant in the
 * production build. Phones stay at 2 columns; tablet/laptop scale up.
 */
const GRID_CLASSES = {
  4: 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4',
  6: 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6',
  8: 'grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8',
};

export function booksGridClass(value) {
  return GRID_CLASSES[parseBooksPerRow(value)];
}
