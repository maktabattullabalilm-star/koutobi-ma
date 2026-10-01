import { describe, expect, it, vi } from 'vitest';
import { reportError } from './report';

describe('reportError (docs/backlog/30)', () => {
  it('scrubs phones and emails, never throws', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      reportError(new Error('order for 0612345678 by a@b.com failed'), 'Checkout 0612345678')
    ).not.toThrow();
    const logged = spy.mock.calls.map((c) => String(c)).join(' ');
    expect(logged).not.toContain('0612345678');
    expect(logged).not.toContain('a@b.com');
    spy.mockRestore();
  });
});
