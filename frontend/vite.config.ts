import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import viteCompression from "vite-plugin-compression";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: true,
    port: 4000,
    strictPort: true,
    proxy: {
      '/sitemap.xml': {
        target: 'http://127.0.0.1:8002',
        changeOrigin: false,
        secure: false,
      },
      '/robots.txt': {
        target: 'http://127.0.0.1:8002',
        changeOrigin: false,
        secure: false,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('/react')) return 'react';
            if (id.includes('zod')) return 'validation';
            if (id.includes('@hookform')) return 'forms';
            if (id.includes('lucide-react')) return 'icons';
            if (id.includes('@vimeo/player')) return 'player';
            if (id.includes('@radix-ui')) return 'radix';
            if (id.includes('date-fns')) return 'dates';
            if (id.includes('@tanstack')) return 'query';
          }
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Desabilita o service worker em desenvolvimento para evitar conflitos com HMR
      disable: mode === 'development',
      selfDestroying: mode === 'development',
      includeAssets: ['favicon.ico', 'logo.png', 'robots.txt'],
      manifest: {
        name: 'Ead Control',
        short_name: 'Ead Control',
        description: 'Plataforma de controle de EAD',
        lang: 'pt-BR',
        theme_color: '#0ea5e9',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/logo.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/logo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\/api\/v1\/public\/options\/branding/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'branding-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 5
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    }),
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
    }),
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
    }),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // pt-BR: Garante uma única instância de React no bundle de dev (evita
    // "Invalid hook call"/"dispatcher is null" por cópia duplicada do React).
    // en-US: Ensures a single React instance in the dev bundle (avoids
    // "Invalid hook call"/"dispatcher is null" from a duplicated React copy).
    dedupe: ['react', 'react-dom', 'react-dom/client', 'scheduler'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-dom/client', 'scheduler', 'react/jsx-dev-runtime'],
  },
}));
