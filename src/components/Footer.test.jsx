import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Footer from './Footer';

vi.mock('../lib/api', () => ({
  getCategories: vi.fn(async () => [
    { id: 'c1', name: 'الفقه والأحكام', parentId: null, depth: 0, totalCount: 3 },
    { id: 'c2', name: 'العبادات', parentId: 'c1', depth: 1, totalCount: 1 },
    { id: 'c3', name: 'الحديث والسنة', parentId: null, depth: 0, totalCount: 2 },
  ]),
}));

vi.mock('../lib/storePages', () => ({
  getVisibleStorePages: vi.fn(async () => []),
}));

vi.mock('../hooks/useSiteContact', () => ({
  useSiteContact: () => ({ phoneDisplay: '', phoneHref: '', whatsapp: '' }),
}));

vi.mock('../hooks/useStorefrontContent', () => ({
  useStorefrontContent: () => ({ footer: { visible: false, content: {} }, brand: { content: {} } }),
}));

const renderFooter = () =>
  render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>
  );

afterEach(cleanup);

describe('Footer categories', () => {
  it('lists the main categories only', async () => {
    renderFooter();

    expect(await screen.findByRole('link', { name: 'الفقه والأحكام' })).toBeTruthy();
    expect(await screen.findByRole('link', { name: 'الحديث والسنة' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'العبادات' })).toBeNull();
  });
});
