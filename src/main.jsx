import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ToastProvider } from './components/Toast';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import NetworkGuard from './components/NetworkGuard';

// The storefront used to ship a Workbox service worker. It is gone now, but a
// browser that installed it can keep serving the old precached app shell.
// Remove any registration and its caches so the live build is always used.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) => registrations.forEach((registration) => registration.unregister()))
    .catch(() => {});
}
if (typeof caches !== 'undefined') {
  caches
    .keys()
    .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
    .catch(() => {});
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <NetworkGuard>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </NetworkGuard>
  </React.StrictMode>
);
