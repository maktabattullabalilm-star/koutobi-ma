import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HeroCarousel from './HeroCarousel';

const BOOKS = [
  { id: 'b1', title_ar: 'كتاب واحد', cover_image: '', is_active: true },
  { id: 'b2', title_ar: 'كتاب اثنان', cover_image: '', is_active: true },
  { id: 'b3', title_ar: 'كتاب ثلاثة', cover_image: '', is_active: true },
];

function slide(overrides = {}) {
  return {
    id: 's1',
    active: true,
    badge: '',
    title: 'الشريحة الأولى',
    description: '',
    shop_label: '',
    how_label: '',
    stats: [],
    book_ids: [],
    background_color: '#234b35',
    ...overrides,
  };
}

function renderCarousel(props) {
  return render(
    <MemoryRouter>
      <HeroCarousel {...props} />
    </MemoryRouter>
  );
}

function setReducedMotion(reduced) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: reduced && query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

beforeEach(() => setReducedMotion(false));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('HeroCarousel', () => {
  it('renders the first visible slide and its selected books in order', () => {
    const { container } = renderCarousel({
      slides: [slide({ book_ids: ['b2', 'b1'] })],
      books: BOOKS,
    });

    expect(screen.getByRole('heading', { name: 'الشريحة الأولى' })).toBeTruthy();
    const links = [...container.querySelectorAll('a[href^="/book/"]')];
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/book/b2', '/book/b1']);
  });

  it('uses one centred cover for a single book and a three-column row for three', () => {
    const { rerender } = renderCarousel({
      slides: [slide({ book_ids: ['b1'] })],
      books: BOOKS,
    });
    expect(screen.getByRole('link', { name: 'كتاب واحد' }).parentElement.className).toContain('grid-cols-1');

    rerender(
      <MemoryRouter>
        <HeroCarousel slides={[slide({ book_ids: ['b1', 'b2', 'b3'] })]} books={BOOKS} />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: 'كتاب واحد' }).parentElement.className).toContain('grid-cols-3');
  });

  it('shows controls and moves between slides', () => {
    renderCarousel({
      slides: [slide(), slide({ id: 's2', title: 'الشريحة الثانية' })],
      books: BOOKS,
    });

    expect(screen.getAllByRole('tab')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'الشريحة التالية' }));
    expect(screen.getByRole('heading', { name: 'الشريحة الثانية' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'الشريحة السابقة' }));
    expect(screen.getByRole('heading', { name: 'الشريحة الأولى' })).toBeTruthy();
  });

  it('jumps to a slide from its dot', () => {
    renderCarousel({
      slides: [slide(), slide({ id: 's2', title: 'الشريحة الثانية' })],
      books: BOOKS,
    });

    fireEvent.click(screen.getAllByRole('tab')[1]);
    expect(screen.getByRole('heading', { name: 'الشريحة الثانية' })).toBeTruthy();
  });

  it('hides controls and does not autoplay when there is only one slide', () => {
    vi.useFakeTimers();
    renderCarousel({ slides: [slide()], books: BOOKS });

    expect(screen.queryByRole('button', { name: 'الشريحة التالية' })).toBeNull();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    act(() => vi.advanceTimersByTime(20000));
    expect(screen.getByRole('heading', { name: 'الشريحة الأولى' })).toBeTruthy();
  });

  it('advances every seven seconds when there are several slides', () => {
    vi.useFakeTimers();
    renderCarousel({
      slides: [slide(), slide({ id: 's2', title: 'الشريحة الثانية' })],
      books: BOOKS,
    });

    act(() => vi.advanceTimersByTime(6999));
    expect(screen.getByRole('heading', { name: 'الشريحة الأولى' })).toBeTruthy();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole('heading', { name: 'الشريحة الثانية' })).toBeTruthy();
  });

  it('does not autoplay for visitors who prefer reduced motion', () => {
    setReducedMotion(true);
    vi.useFakeTimers();
    renderCarousel({
      slides: [slide(), slide({ id: 's2', title: 'الشريحة الثانية' })],
      books: BOOKS,
    });

    act(() => vi.advanceTimersByTime(20000));
    expect(screen.getByRole('heading', { name: 'الشريحة الأولى' })).toBeTruthy();
  });

  it('skips hidden slides and renders nothing without visible slides', () => {
    const { rerender } = renderCarousel({
      slides: [slide({ active: false }), slide({ id: 's2', title: 'الشريحة الثانية' })],
      books: BOOKS,
    });
    expect(screen.queryByRole('heading', { name: 'الشريحة الأولى' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'الشريحة الثانية' })).toBeTruthy();

    rerender(
      <MemoryRouter>
        <HeroCarousel slides={[slide({ active: false })]} books={BOOKS} />
      </MemoryRouter>
    );
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('keeps the slide text when its books are no longer available', () => {
    renderCarousel({
      slides: [slide({ book_ids: ['gone'] })],
      books: BOOKS,
    });
    expect(screen.getByRole('heading', { name: 'الشريحة الأولى' })).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });
});
