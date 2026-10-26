import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { mockShow, mockSave } = vi.hoisted(() => ({
  mockShow: vi.fn(),
  mockSave: vi.fn(async () => {}),
}));

vi.mock('../../components/Toast', () => ({ useToast: () => ({ show: mockShow }) }));

vi.mock('../../lib/storefrontContent', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getStorefrontContent: vi.fn(async () =>
      Object.fromEntries(
        Object.entries(actual.CONTENT_DEFAULTS).map(([key, content]) => [key, { content, visible: true }])
      )
    ),
    adminSaveStorefrontContent: mockSave,
  };
});

const { default: StorefrontContent } = await import('./StorefrontContent');

const openBrandEditor = async () => {
  render(
    <MemoryRouter>
      <StorefrontContent />
    </MemoryRouter>
  );
  fireEvent.click(await screen.findByRole('button', { name: /هوية المتجر/ }));
  fireEvent.click(await screen.findByRole('button', { name: /الشعار والألوان وروابط التواصل/ }));
  return screen.findByLabelText('البريد الإلكتروني للتواصل');
};

beforeEach(() => {
  mockShow.mockClear();
  mockSave.mockClear();
});
afterEach(cleanup);

describe('Storefront content — contact e-mail', () => {
  it('is editable from روابط مواقع التواصل and starts at the store address', async () => {
    const input = await openBrandEditor();
    expect(input.value).toBe('salam@koutobi.ma');
  });

  it('saves the edited address into the brand section', async () => {
    const input = await openBrandEditor();
    fireEvent.change(input, { target: { value: 'contact@koutobi.ma' } });
    fireEvent.click(screen.getByRole('button', { name: /حفظ هذا القسم/ }));

    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
    expect(mockSave.mock.calls[0][0]).toBe('brand');
    expect(mockSave.mock.calls[0][1].contact_email).toBe('contact@koutobi.ma');
  });

  it('blocks saving a malformed address', async () => {
    const input = await openBrandEditor();
    fireEvent.change(input, { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByRole('button', { name: /حفظ هذا القسم/ }));

    await waitFor(() => expect(mockShow).toHaveBeenCalled());
    expect(mockShow.mock.calls[0][0]).toMatch(/بريداً إلكترونياً صالحاً/);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('allows clearing the address to hide it', async () => {
    const input = await openBrandEditor();
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /حفظ هذا القسم/ }));

    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
    expect(mockSave.mock.calls[0][1].contact_email).toBe('');
  });
});
