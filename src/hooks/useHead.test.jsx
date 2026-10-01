import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { useHead } from './useHead';

afterEach(cleanup);

function Page(props) {
  useHead(props);
  return <span>body</span>;
}

describe('useHead (docs/backlog/19)', () => {
  it('sets title, description, og tags and canonical', () => {
    document.title = 'x';
    render(<Page title="حصن المسلم" description="وصف" image="https://x/y.jpg" path="/book/1" />);
    expect(document.title).toBe('حصن المسلم | كُتُبِي.ما');
    expect(document.head.querySelector('meta[property="og:title"]').getAttribute('content')).toContain(
      'حصن المسلم'
    );
    expect(document.head.querySelector('meta[property="og:image"]').getAttribute('content')).toBe(
      'https://x/y.jpg'
    );
    expect(document.head.querySelector('link[rel="canonical"]').getAttribute('href')).toContain('/book/1');
  });

  it('restores the previous title on unmount', () => {
    document.title = 'before';
    const { unmount } = render(<Page title="مؤقت" />);
    expect(document.title).toContain('مؤقت');
    unmount();
    expect(document.title).toBe('before');
  });
});
