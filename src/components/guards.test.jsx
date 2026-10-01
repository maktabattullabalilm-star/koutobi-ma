import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import ErrorBoundary from './ErrorBoundary';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => globalThis.__authState,
}));

globalThis.__authState = { session: null, loading: false, isAdmin: false };

afterEach(cleanup);

function guard() {
  return render(
    <MemoryRouter initialEntries={['/admin/dashboard']}>
      <Routes>
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute>
              <span>secret-area</span>
            </ProtectedRoute>
          }
        />
        <Route path="/admin" element={<span>login-page</span>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute (docs/backlog/21)', () => {
  it('shows a spinner while auth loads', () => {
    globalThis.__authState = { session: null, loading: true, isAdmin: false };
    const { container } = guard();
    expect(container.textContent).toContain('جارٍ التحقق');
  });

  it('redirects guests to /admin', () => {
    globalThis.__authState = { session: null, loading: false, isAdmin: false };
    guard();
    expect(screen.getAllByText('login-page').length).toBeGreaterThan(0);
  });

  it('redirects non-admin users to /admin', () => {
    globalThis.__authState = { session: { access_token: 'x' }, loading: false, isAdmin: false };
    guard();
    expect(screen.getAllByText('login-page').length).toBeGreaterThan(0);
    expect(screen.queryByText('secret-area')).toBeNull();
  });

  it('renders children for admins', () => {
    globalThis.__authState = { session: { access_token: 'x' }, loading: false, isAdmin: true };
    guard();
    expect(screen.getByText('secret-area')).toBeTruthy();
  });
});

function Boom() {
  throw new Error('render crash');
}

describe('ErrorBoundary (docs/backlog/21)', () => {
  it('renders the Arabic fallback instead of crashing', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <MemoryRouter>
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>
      </MemoryRouter>
    );
    expect(screen.getByText('حدث خطأ غير متوقع')).toBeTruthy();
    spy.mockRestore();
  });

  it('passes children through when healthy', () => {
    render(
      <MemoryRouter>
        <ErrorBoundary>
          <span>fine</span>
        </ErrorBoundary>
      </MemoryRouter>
    );
    expect(screen.getByText('fine')).toBeTruthy();
  });
});
