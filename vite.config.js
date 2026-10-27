import { defineConfig } from 'vite';
import path from 'path';
import react from '@vitejs/plugin-react';
import { localFunctions } from './vite.local-functions.mjs';

/**
 * Workbox precaches `/index.html` *together with its response headers*. If the
 * shell is byte-identical between deploys its precache revision never changes,
 * so the SW never refetches it and clients keep serving the OLD document — and
 * therefore the OLD CSP — indefinitely. That is how `img-src blob:` shipped
 * but never reached browsers, breaking every admin image upload.
 *
 * Stamping a unique id into the shell on each build guarantees the precache
 * entry is refetched, so header changes (CSP especially) actually land.
 */
const buildStamp = {
  name: 'build-stamp',
  apply: 'build',
  transformIndexHtml() {
    return [
      {
        tag: 'meta',
        attrs: { name: 'build-id', content: Date.now().toString(36) },
        injectTo: 'head-prepend',
      },
    ];
  },
};

export default defineConfig({
  plugins: [
    react(),
    localFunctions(), // dev-only: serve Netlify functions under /api/*
    buildStamp,
  ],
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 300,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-radix': ['radix-ui'],
          admin: [
            './src/pages/admin/Dashboard.jsx',
            './src/pages/admin/BooksAdmin.jsx',
            './src/pages/admin/BookForm.jsx',
            './src/pages/admin/OrdersAdmin.jsx',
            './src/pages/admin/CatalogData.jsx',
            './src/pages/admin/Settings.jsx',
            './src/pages/admin/StockAdmin.jsx',
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{js,jsx,ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/**/*.test.{js,jsx}', 'src/components/ui/**', 'src/main.jsx'],
      // Ratchet floor (backlog 26): fail the build if coverage drops.
      thresholds: { lines: 40, functions: 45, branches: 60, statements: 40 },
    },
  },
});
