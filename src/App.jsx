import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import StoreLayout from './components/StoreLayout';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { Spinner } from '@/components/ui/spinner';

// Code-split by route (docs/backlog/17): the storefront first paint never
// downloads admin code (BookForm alone was ~1/3 of the old bundle).
const Home = lazy(() => import('./pages/Home'));
const Catalog = lazy(() => import('./pages/Catalog'));
const BookDetail = lazy(() => import('./pages/BookDetail'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const ThankYou = lazy(() => import('./pages/ThankYou'));
const NotFound = lazy(() => import('./pages/NotFound'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminSetup = lazy(() => import('./pages/admin/AdminSetup'));
const ResetPassword = lazy(() => import('./pages/admin/ResetPassword'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const BooksAdmin = lazy(() => import('./pages/admin/BooksAdmin'));
const BookForm = lazy(() => import('./pages/admin/BookForm'));
const BookImport = lazy(() => import('./pages/admin/BookImport'));
const OrdersAdmin = lazy(() => import('./pages/admin/OrdersAdmin'));
const CatalogData = lazy(() => import('./pages/admin/CatalogData'));
const Settings = lazy(() => import('./pages/admin/Settings'));

function RouteFallback() {
  return (
    <div className="container-x py-20 text-center">
      <Spinner className="mx-auto size-10 text-brand" />
      <p className="mt-3 text-sm text-soft">جارٍ التحميل…</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route
            element={
              <ErrorBoundary>
                <StoreLayout />
              </ErrorBoundary>
            }
          >
            <Route path="/" element={<Home />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/book/:id" element={<BookDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/thank-you" element={<ThankYou />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          <Route path="/admin" element={<Outlet />}>
            <Route index element={<AdminLogin />} />
            <Route path="setup" element={<AdminSetup />} />
            <Route path="reset-password" element={<ResetPassword />} />
            <Route
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="books" element={<BooksAdmin />} />
              <Route path="books/new" element={<BookForm />} />
              <Route path="books/import" element={<BookImport />} />
              <Route path="books/:id/edit" element={<BookForm />} />
              <Route path="orders" element={<OrdersAdmin />} />
              <Route path="catalog" element={<CatalogData />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
