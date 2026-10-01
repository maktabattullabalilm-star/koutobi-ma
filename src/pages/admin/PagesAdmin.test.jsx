import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PagesAdmin, { MarkdownPreview } from './PagesAdmin';

vi.mock('../../lib/storePages', () => ({
  adminDeleteStorePage: vi.fn(),
  adminGetStorePages: vi.fn(async () => [{
    id: 'page-1', title: 'معلومات الشحن', slug: 'shipping-information',
    meta_description: '', content_markdown: '## الشحن\n\nنوصل لجميع المدن.',
    is_visible: false, is_system: true,
  }]),
  adminSaveStorePage: vi.fn(),
}));
vi.mock('../../components/Toast', () => ({ useToast: () => ({ show: vi.fn() }) }));

afterEach(cleanup);

describe('MarkdownPreview', () => {
  it('renders Markdown and does not render embedded raw HTML', () => {
    const { container } = render(<MarkdownPreview source={'## Shipping\n\n**Free delivery**\n\n<script>alert(1)</script><img src="x" onerror="alert(1)" />'} />);
    expect(screen.getByRole('heading', { name: 'Shipping', level: 2 })).toBeTruthy();
    expect(screen.getByText('Free delivery').tagName).toBe('STRONG');
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });

  it('switches between the writing editor and a full-width preview', async () => {
    render(<MemoryRouter><PagesAdmin /></MemoryRouter>);
    expect(await screen.findByLabelText('محرر محتوى الصفحة')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'مساعدة تنسيق المحتوى' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'معاينة' }));
    expect(screen.queryByLabelText('محرر محتوى الصفحة')).toBeNull();
    expect(screen.getByRole('heading', { name: 'الشحن', level: 2 })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'تحرير' }));
    expect(screen.getByLabelText('محرر محتوى الصفحة')).toBeTruthy();
  });
});
