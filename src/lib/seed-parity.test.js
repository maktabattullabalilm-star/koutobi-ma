import { describe, expect, it } from 'vitest';
import seedSql from '../../supabase/seed.sql?raw';
import { SAMPLE_BOOKS } from './sampleData';

/**
 * Guards the sampleData ↔ seed.sql mirror (docs/backlog/23).
 * DEMO_MODE fixtures must match the SQL seed (titles + prices),
 * or local testing diverges from fresh installs.
 */
describe('seed parity (sampleData ↔ seed.sql)', () => {
  it('covers the same books with the same prices', () => {
    expect(SAMPLE_BOOKS.length).toBeGreaterThan(0);
    for (const b of SAMPLE_BOOKS) {
      expect(seedSql, b.title_ar).toContain(`'${b.title_ar}'`);
      expect(seedSql, String(b.price)).toContain(`\n  ${b.price},`);
    }
  });

  it('uses categories from the fallback list', async () => {
    const { FALLBACK_CATEGORIES } = await import('./site');
    for (const b of SAMPLE_BOOKS) {
      expect(FALLBACK_CATEGORIES, b.title_ar).toContain(b.category);
    }
  });
});
