import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HashLink from './HashLink';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('HashLink', () => {
  it('re-scrolls when the target hash is already in the URL', () => {
    const scrollIntoView = vi.fn();
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = scrollIntoView;

    render(
      <MemoryRouter initialEntries={['/#how']}>
        <HashLink to="/#how">كيف أطلب؟</HashLink>
        <section id="how">طريقة الطلب</section>
      </MemoryRouter>
    );

    expect(fireEvent.click(screen.getByRole('link', { name: 'كيف أطلب؟' }))).toBe(false);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' });

    Element.prototype.scrollIntoView = original;
  });

  it('leaves normal navigation alone when the hash is not active yet', () => {
    const scrollIntoView = vi.fn();
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = scrollIntoView;

    render(
      <MemoryRouter initialEntries={['/']}>
        <HashLink to="/#how">كيف أطلب؟</HashLink>
        <section id="how">طريقة الطلب</section>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('link', { name: 'كيف أطلب؟' }));
    expect(scrollIntoView).not.toHaveBeenCalled();

    Element.prototype.scrollIntoView = original;
  });
});
