import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StockAdmin from './StockAdmin';

const mocks = vi.hoisted(() => ({
  adjust: vi.fn(async () => ({})),
  bulk: vi.fn(async () => []),
  getBooks: vi.fn(async () => [{
    id: 'book-1', title_ar: 'كتاب الاختبار', author_ar: 'مؤلف', category: 'الفقه',
    isbn: '9780000000001', stock_qty: 2, is_out_of_stock: false, cover_image: '',
  }]),
  getMovements: vi.fn(async () => []),
  show: vi.fn(),
}));

vi.mock('../../lib/admin', () => ({
  adminAdjustStock: mocks.adjust,
  adminBulkStockIn: mocks.bulk,
  adminGetBooks: mocks.getBooks,
  adminGetStockMovements: mocks.getMovements,
}));
vi.mock('../../components/Toast', () => ({ useToast: () => ({ show: mocks.show }) }));

const originalScrollIntoView = Element.prototype.scrollIntoView;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  if (originalScrollIntoView) Element.prototype.scrollIntoView = originalScrollIntoView;
  else delete Element.prototype.scrollIntoView;
});

describe('StockAdmin', () => {
  it('shows stock summary, lets the admin correct a count, and logs the change', async () => {
    Element.prototype.scrollIntoView = vi.fn();
    render(<MemoryRouter><StockAdmin /></MemoryRouter>);
    expect(await screen.findByText('كتاب الاختبار')).toBeTruthy();
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /تعديل/ }));
    fireEvent.click(screen.getByRole('combobox', { name: 'نوع التعديل' }));
    fireEvent.click(await screen.findByRole('option', { name: 'ضبط الرصيد الفعلي' }));
    fireEvent.change(screen.getByLabelText('الرصيد الفعلي بعد الجرد'), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText('ملاحظة أو مرجع (اختياري)'), { target: { value: 'جرد الرف الأول' } });
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد وتسجيل الحركة' }));
    await waitFor(() => expect(mocks.adjust).toHaveBeenCalledWith({
      bookId: 'book-1', delta: 5, targetQty: 7, reason: 'correction', note: 'جرد الرف الأول',
    }));
  });

  it('submits a bulk stock-in action for selected books', async () => {
    render(<MemoryRouter><StockAdmin /></MemoryRouter>);
    await screen.findByText('كتاب الاختبار');
    fireEvent.click(screen.getByLabelText('تحديد كتاب الاختبار'));
    fireEvent.click(screen.getByRole('button', { name: 'توريد جماعي' }));
    fireEvent.change(screen.getByLabelText('كمية لكل كتاب'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد التوريد' }));
    await waitFor(() => expect(mocks.bulk).toHaveBeenCalledWith({
      items: [{ book_id: 'book-1', qty: 4 }], reason: 'restock', note: '',
    }));
  });
});
