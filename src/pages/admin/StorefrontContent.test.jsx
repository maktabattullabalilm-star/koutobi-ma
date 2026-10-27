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
        Object.entries(actual.CONTENT_SHAPES).map(([key, content]) => [key, { content, visible: true }])
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
  it('is editable from روابط مواقع التواصل and starts empty (no bundled address)', async () => {
    const input = await openBrandEditor();
    expect(input.value).toBe('');
  });

  it('saves the edited address into the brand section', async () => {
    const input = await openBrandEditor();
    fireEvent.change(input, { target: { value: 'contact@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /حفظ هذا القسم/ }));

    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
    expect(mockSave.mock.calls[0][0]).toBe('brand');
    expect(mockSave.mock.calls[0][1].contact_email).toBe('contact@example.com');
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

describe('Storefront content — customer reviews', () => {
  const openReviewsEditor = async () => {
    render(
      <MemoryRouter>
        <StorefrontContent initialSection="home_testimonials" />
      </MemoryRouter>
    );
    return screen.findByRole('button', { name: /إضافة عنصر/ });
  };

  it('opens directly on the reviews section', async () => {
    await openReviewsEditor();
    expect(screen.getByRole('heading', { name: 'آراء العملاء', level: 1 })).toBeTruthy();
    expect(screen.getByRole('button', { name: /إضافة عنصر/ })).toBeTruthy();
  });

  it('adds a review with name, rating, text and verified badge', async () => {
    const add = await openReviewsEditor();
    fireEvent.click(add);

    fireEvent.change(screen.getByLabelText('اسم العميل'), { target: { value: 'أم يوسف' } });
    fireEvent.change(screen.getByLabelText('نص الرأي'), {
      target: { value: 'خدمة ممتازة وتوصيل سريع' },
    });
    fireEvent.click(screen.getByRole('button', { name: '4 من 5' }));
    fireEvent.click(screen.getByRole('switch', { name: 'شراء موثّق' }));
    fireEvent.click(screen.getByRole('button', { name: /حفظ هذا القسم/ }));

    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
    const [key, content] = mockSave.mock.calls[0];
    expect(key).toBe('home_testimonials');
    expect(content.items).toEqual([
      {
        name: 'أم يوسف',
        rating: 4,
        text: 'خدمة ممتازة وتوصيل سريع',
        verified: true,
      },
    ]);
  });

  it('starts a new review with five stars and no verified badge', async () => {
    const add = await openReviewsEditor();
    fireEvent.click(add);

    expect(screen.getByRole('button', { name: '5 من 5' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('switch', { name: 'شراء موثّق' }).getAttribute('aria-checked')).toBe('false');
  });
});
