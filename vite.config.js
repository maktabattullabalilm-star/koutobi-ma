import { defineConfig } from 'vite';
import path from 'path';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { localFunctions } from './vite.local-functions.mjs';

export default defineConfig({
  plugins: [
    react(),
    localFunctions(), // dev-only: serve Netlify functions under /api/*
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false, // we ship our own public/manifest.webmanifest
      workbox: {
        // Never cache order placement or admin writes.
        navigateFallbackDenylist: [/^\/api\//, /^\/admin/],
        runtimeCaching: [
          {
            // R2 covers: immutable, cache-first.
            urlPattern: /^https:\/\/.*\.r2\.dev\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'covers',
              expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 3600 },
            },
          },
          {
            // Supabase GETs (books/categories): fresh first, brief fallback.
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            method: 'GET',
            options: {
              cacheName: 'supabase-get',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 5 * 60 },
            },
          },
        ],
      },
    }),
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
      // Ratchet floor (docs/backlog/26): fail the build if coverage drops.
      thresholds: { lines: 40, functions: 45, branches: 60, statements: 40 },
    },
  },
});
