import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Checkout from './Checkout';

vi.mock('../context/CartContext', () => ({
  useCart: () => ({
    items: [{ id: '1', title: 'حصن المسلم', price: 15, qty: 1, stock: 10, cover: '' }],
    total: 15,
    count: 1,
    clear: vi.fn(),
  }),
}));

vi.mock('../lib/api', () => ({
  createOrder: vi.fn(),
}));

vi.mock('../components/Toast', () => ({
  useToast: () => ({ show: vi.fn() }),
  ToastProvider: ({ children }) => <>{children}</>,
}));

afterEach(cleanup);

function page() {
  return render(
    <MemoryRouter>
      <Checkout />
    </MemoryRouter>
  );
}

describe('Checkout (docs/backlog/26)', () => {
  it('blocks empty submit with Arabic field errors (no order call)', async () => {
    const { createOrder } = await import('../lib/api');
    page();
    fireEvent.click(screen.getByRole('button', { name: /تأكيد الطلب/ }));
    expect(await screen.findByText('الرجاء إدخال الاسم كاملاً')).toBeTruthy();
    expect(screen.getByText(/رقم هاتف مغربي/)).toBeTruthy();
    expect(createOrder).not.toHaveBeenCalled();
  });

  it('rejects garbage phones without calling the server', async () => {
    const { createOrder } = await import('../lib/api');
    page();
    fireEvent.change(screen.getByPlaceholderText(/0612345678/), { target: { value: '+++++++++++' } });
    fireEvent.click(screen.getByRole('button', { name: /تأكيد الطلب/ }));
    expect(await screen.findByText(/رقم هاتف مغربي/)).toBeTruthy();
    expect(createOrder).not.toHaveBeenCalled();
  });
});
