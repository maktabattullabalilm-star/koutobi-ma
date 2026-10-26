import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mocks = vi.hoisted(() => ({
  categories: [
    { id: 'root', name_ar: 'الفقه وأصوله', parent_id: null, sort: 10 },
    { id: 'sibling', name_ar: 'أصول الفقه', parent_id: null, sort: 20 },
  ],
  updateCategory: vi.fn(async () => ({})),
  show: vi.fn(),
}));

vi.mock('../../lib/admin', () => ({
  adminGetCategories: vi.fn(async () => mocks.categories),
  adminCreateCategory: vi.fn(),
  adminUpdateCategory: mocks.updateCategory,
  adminDeleteCategory: vi.fn(),
  adminGetAttributeOptions: vi.fn(async () => []),
  adminCreateAttributeOption: vi.fn(),
  adminUpdateAttributeOption: vi.fn(),
  adminDeleteAttributeOption: vi.fn(),
  adminGetBooks: vi.fn(async () => []),
  adminPropagateRename: vi.fn(),
  adminReassignBooks: vi.fn(),
  adminReorderRows: vi.fn(),
  getAppSetting: vi.fn(async () => null),
  adminUpdateAppSetting: vi.fn(async () => ({})),
}));

vi.mock('../../components/Toast', () => ({
  useToast: () => ({ show: mocks.show }),
}));

const { default: CatalogData } = await import('./CatalogData');

if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = vi.fn();

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CatalogData drag and drop', () => {
  it('stages a dragged category as a child and saves it only after confirmation', async () => {
    render(
      <MemoryRouter>
        <CatalogData />
      </MemoryRouter>
    );

    const rowFor = async (text) => {
      const nodes = await screen.findAllByText(text);
      return nodes.map((node) => node.closest('li')).find(Boolean);
    };
    const source = await rowFor('أصول الفقه');
    const target = await rowFor('الفقه وأصوله');
    const dataTransfer = {
      effectAllowed: '',
      dropEffect: '',
      setData: vi.fn(),
      getData: vi.fn(),
    };

    fireEvent.dragStart(source, { dataTransfer });
    fireEvent.dragOver(target, { dataTransfer });
    fireEvent.drop(target, { dataTransfer });

    expect(mocks.updateCategory).not.toHaveBeenCalled();
    expect(await screen.findByRole('button', { name: 'حفظ التغييرات' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'حفظ التغييرات' }));

    await waitFor(() =>
      expect(mocks.updateCategory).toHaveBeenCalledWith(
        'sibling',
        expect.objectContaining({ parent_id: 'root', sort: 10 })
      )
    );
  });
});
