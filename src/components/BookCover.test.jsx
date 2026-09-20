import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import BookCover from './BookCover';

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
});
