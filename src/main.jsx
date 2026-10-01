import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ToastProvider } from './components/Toast';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { registerSW } from 'virtual:pwa-register';

// Offline shell: keep the precache fresh without prompting (storefront-safe).
registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  </React.StrictMode>
);
