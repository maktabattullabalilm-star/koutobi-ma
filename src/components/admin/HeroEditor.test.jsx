import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import HeroEditor from './HeroEditor';

const { mockGetBooks } = vi.hoisted(() => ({ mockGetBooks: vi.fn() }));

vi.mock('../../lib/admin', () => ({ adminGetBooks: mockGetBooks }));

const BOOKS = Array.from({ length: 10 }, (_, index) => ({
  id: `book-${index}`,
  title_ar: `كتاب ${index}`,
  author_ar: `مؤلف ${index}`,
  cover_image: '',
  is_active: true,
}));

function baseSlide(overrides = {}) {
  return {
    id: 'slide-1',
    active: true,
    badge: '',
    title: 'عنوان الشريحة',
    description: '',
    shop_label: '',
    how_label: '',
    stats: [],
    book_ids: [],
    background_color: '#234b35',
    ...overrides,
  };
}

function Harness({ initial }) {
  const [content, setContent] = useState(initial);
  return <HeroEditor content={content} onChange={setContent} />;
}

function renderEditor(initial) {
  return render(<Harness initial={initial} />);
}

beforeEach(() => {
  mockGetBooks.mockResolvedValue(BOOKS);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('HeroEditor', () => {
  it('seeds a legacy hero with its current three newest books', async () => {
    renderEditor({
      badge: 'شارة قديمة',
      title: 'العنوان القديم',
      description: 'وصف',
      shop_label: 'تسوق',
      how_label: 'كيف أطلب',
      stats: [{ value: '+2000', label: 'عميل' }],
    });

    expect(await screen.findByDisplayValue('العنوان القديم')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('3 / 9')).toBeTruthy());

    const selected = screen.getByRole('list', { name: 'الكتب المختارة' });
    expect(within(selected).getAllByRole('listitem')).toHaveLength(3);
    expect(within(selected).getByText('كتاب 0')).toBeTruthy();
    expect(within(selected).getByText('كتاب 2')).toBeTruthy();
  });

  it('adds a slide and selects it for editing', async () => {
    renderEditor({ slides: [baseSlide()] });
    await screen.findByDisplayValue('عنوان الشريحة');

    fireEvent.click(screen.getByRole('button', { name: /إضافة شريحة/ }));
    expect(screen.getByText('شريحة 2')).toBeTruthy();
    expect(screen.getByText('شريحة بدون عنوان')).toBeTruthy();
  });

  it('duplicates a slide with a new copy', async () => {
    renderEditor({ slides: [baseSlide()] });
    await screen.findByDisplayValue('عنوان الشريحة');

    fireEvent.click(screen.getByRole('button', { name: 'نسخ الشريحة 1' }));
    const list = screen.getByRole('list', { name: 'شرائح الواجهة' });
    expect(within(list).getByText('عنوان الشريحة (نسخة)')).toBeTruthy();
    expect(screen.getByText('شريحة 2')).toBeTruthy();
  });

  it('reorders and deletes slides', async () => {
    renderEditor({
      slides: [baseSlide(), baseSlide({ id: 'slide-2', title: 'الثانية' })],
    });
    await screen.findByDisplayValue('عنوان الشريحة');

    fireEvent.click(screen.getByRole('button', { name: 'تحريك الشريحة 2 لأعلى' }));
    const list = screen.getByRole('list', { name: 'شرائح الواجهة' });
    expect(within(list).getAllByRole('listitem')[0].textContent).toContain('الثانية');

    fireEvent.click(screen.getByRole('button', { name: 'حذف الشريحة 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'حذف الشريحة 1' }));
    expect(screen.getByText('لا توجد شرائح بعد')).toBeTruthy();
  });

  it('hides a slide from the storefront', async () => {
    renderEditor({ slides: [baseSlide()] });
    await screen.findByDisplayValue('عنوان الشريحة');

    const toggle = screen.getByRole('switch', { name: 'إظهار الشريحة 1' });
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(toggle);
    expect(screen.getByText('مخفية')).toBeTruthy();
  });

  it('limits each slide to nine books', async () => {
    renderEditor({
      slides: [baseSlide({ book_ids: BOOKS.slice(0, 9).map((book) => book.id) })],
    });

    expect(await screen.findByText('9 / 9')).toBeTruthy();
    const unselected = await screen.findByRole('button', { name: /كتاب 9/ });
    expect(unselected.disabled).toBe(true);
    expect(screen.getByText('الحد الأقصى 9 كتب لكل شريحة.')).toBeTruthy();
  });

  it('adds, removes and reorders selected books', async () => {
    renderEditor({
      slides: [baseSlide({ book_ids: ['book-1', 'book-0'] })],
    });

    await waitFor(() => expect(screen.getByText('2 / 9')).toBeTruthy());
    const selected = screen.getByRole('list', { name: 'الكتب المختارة' });
    expect(within(selected).getAllByRole('listitem')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'تحريك كتاب 0 لأعلى' }));
    expect(within(selected).getAllByRole('listitem')[0].textContent).toContain('كتاب 0');

    fireEvent.click(screen.getByRole('button', { name: 'إزالة كتاب 1' }));
    await waitFor(() => expect(screen.getByText('1 / 9')).toBeTruthy());
    expect(within(selected).queryByText('كتاب 1')).toBeNull();

    const add = await screen.findByRole('button', { name: /كتاب 3/ });
    fireEvent.click(add);
    await waitFor(() => expect(screen.getByText('2 / 9')).toBeTruthy());
  });

  it('filters the book picker by title or author', async () => {
    renderEditor({ slides: [baseSlide()] });
    await screen.findByRole('button', { name: /كتاب 0/ });

    fireEvent.change(screen.getByLabelText('ابحث عن كتاب'), { target: { value: 'مؤلف 7' } });
    expect(screen.getByRole('button', { name: /كتاب 7/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /كتاب 0/ })).toBeNull();
  });

  it('edits copy, stats and the background colour', async () => {
    renderEditor({ slides: [baseSlide()] });
    const title = await screen.findByDisplayValue('عنوان الشريحة');

    fireEvent.change(title, { target: { value: 'عنوان جديد' } });
    expect(screen.getByDisplayValue('عنوان جديد')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /إضافة رقم/ }));
    fireEvent.change(screen.getByLabelText('قيمة الرقم 1'), { target: { value: '+500' } });
    fireEvent.change(screen.getByLabelText('وصف الرقم 1'), { target: { value: 'طلب' } });
    expect(screen.getByDisplayValue('+500')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('رمز لون الخلفية'), { target: { value: '#fef3c7' } });
    expect(screen.getByLabelText('لون خلفية الشريحة').value).toBe('#fef3c7');

    fireEvent.change(screen.getByLabelText('رمز لون الخلفية'), { target: { value: 'red' } });
    expect(screen.getByText('أدخل لوناً مثل #35724e.')).toBeTruthy();
  });

  it('shows an empty state before the first slide is added', () => {
    renderEditor({ slides: [] });
    expect(screen.getByText('لا توجد شرائح بعد')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /إضافة أول شريحة/ }));
    expect(screen.getByText('شريحة بدون عنوان')).toBeTruthy();
  });
});
