import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import StoreLayout from './components/StoreLayout';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import BookDetail from './pages/BookDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import ThankYou from './pages/ThankYou';
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import BooksAdmin from './pages/admin/BooksAdmin';
import BookForm from './pages/admin/BookForm';
import OrdersAdmin from './pages/admin/OrdersAdmin';

function NotFound() {
  return (
    <div className="container-x py-20 text-center">
      <div className="text-5xl font-bold text-brand">٤٠٤</div>
      <h1 className="mt-2 text-lg font-bold text-ink">الصفحة غير موجودة</h1>
      <p className="mt-1 text-sm text-soft">يبدو أن هذه الصفحة انتقلت أو حُذفت.</p>
      <a href="/" className="btn-primary mt-6">العودة للرئيسية</a>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route element={<StoreLayout />}>
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
          <Route element={<AdminLayout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="books" element={<BooksAdmin />} />
            <Route path="books/new" element={<BookForm />} />
            <Route path="books/:id/edit" element={<BookForm />} />
            <Route path="orders" element={<OrdersAdmin />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}