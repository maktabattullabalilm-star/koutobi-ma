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
          // NOTE: no CacheFirst rule for R2 covers — it provably broke
          // <img> loads under SW control (every card fell back to the
          // placeholder while direct fetches 200'd). Covers load straight
          // from R2; revisit offline covers only with a tested strategy.
          {
            // Contact numbers (Admin → Settings): always live, like book
            // titles — never serve a stale cached number after the owner
            // saves a new one. Must precede the generic Supabase rule.
            urlPattern: /\/rest\/v1\/app_settings.*/i,
            handler: 'NetworkOnly',
            method: 'GET',
          },
          {
            // Admin → Content updates must be visible immediately.
            urlPattern: /\/rest\/v1\/storefront_content.*/i,
            handler: 'NetworkOnly',
            method: 'GET',
          },
          {
            // Published information pages are live-updated from the admin.
            urlPattern: /\/rest\/v1\/store_pages.*/i,
            handler: 'NetworkOnly',
            method: 'GET',
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
      // Ratchet floor (docs/backlog/26): fail the build if coverage drops.
      thresholds: { lines: 40, functions: 45, branches: 60, statements: 40 },
    },
  },
});
