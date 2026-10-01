import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import BookCover from './BookCover';

afterEach(cleanup);

describe('BookCover', () => {
  it('renders a placeholder when src is missing', () => {
    render(<BookCover src="" alt="كتاب" className="h-10 w-8" />);
    expect(screen.getByRole('img', { name: 'كتاب' })).toBeTruthy();
  });

  it('swaps to the placeholder on image error', () => {
    render(<BookCover src="https://example.com/broken.jpg" alt="غلاف" className="h-10 w-8" />);
    fireEvent.error(screen.getByAltText('غلاف'));
    expect(screen.getByRole('img', { name: 'غلاف' })).toBeTruthy();
  });

  it('renders the img when the source loads', () => {
    render(<BookCover src="https://example.com/ok.jpg" alt="غلاف" className="box" imgClassName="pic" />);
    const img = screen.getByAltText('غلاف');
    expect(img.tagName).toBe('IMG');
    expect(img.getAttribute('src')).toBe('https://example.com/ok.jpg');
  });

  it('lazy-loads with async decoding by default (no srcset without a CDN)', () => {
    render(<BookCover src="https://example.com/ok.jpg" alt="غلاف" />);
    const img = screen.getByAltText('غلاف');
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('decoding')).toBe('async');
    expect(img.getAttribute('srcset')).toBeNull();
  });

  it('marks the LCP cover eager with high fetch priority', () => {
    render(<BookCover src="https://example.com/ok.jpg" alt="غلاف" eager />);
    const img = screen.getByAltText('غلاف');
    expect(img.getAttribute('loading')).toBe('eager');
    expect(img.getAttribute('fetchpriority')).toBe('high');
  });

  it('overlays a wax seal when the book is sold out', () => {
    const { container } = render(<BookCover src="https://example.com/ok.jpg" alt="غلاف" soldOut />);
    expect(container.querySelector('svg')).toBeTruthy();
  });
});
