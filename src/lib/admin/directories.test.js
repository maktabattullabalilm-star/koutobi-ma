import { describe, expect, it } from 'vitest';
import { canonicalAuthorName, canonicalPublisherName, directoryKey } from './directories';

describe('catalog directories', () => {
  it('removes leading author honorifics while retaining the full useful name', () => {
    expect(canonicalAuthorName('الشيخ عبد الرحمن بن ناصر السعدي')).toBe('عبد الرحمن بن ناصر السعدي');
    expect(canonicalAuthorName('الإمام ابن قيم الجوزية')).toBe('ابن قيم الجوزية');
  });

  it('uses one comparison key for Arabic spelling variants', () => {
    expect(directoryKey('أحمد بن علي الجصاص')).toBe(directoryKey('احمد بن علي الجصّاص'));
    expect(canonicalPublisherName('  دار   ابن حزم  ')).toBe('دار ابن حزم');
  });
});
