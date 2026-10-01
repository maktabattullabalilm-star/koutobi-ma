import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import ScrollToTop from './ScrollToTop';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ScrollToTop', () => {
  it('scrolls to the requested hash target instead of resetting to the page top', () => {
    const scrollIntoView = vi.fn();
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = scrollIntoView;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback();
      return 1;
    });
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

    render(
      <MemoryRouter initialEntries={['/catalog']}>
        <ScrollToTop />
        <Routes>
          <Route path="/catalog" element={<Link to="/#how">كيف أطلب؟</Link>} />
          <Route path="/" element={<main id="main-content"><section id="how">طريقة الطلب</section></main>} />
        </Routes>
      </MemoryRouter>
    );

    window.scrollTo.mockClear();
    fireEvent.click(screen.getByRole('link', { name: 'كيف أطلب؟' }));
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'instant' });
    expect(window.scrollTo).not.toHaveBeenCalledWith({ top: 0, behavior: 'instant' });
    Element.prototype.scrollIntoView = original;
  });
});
