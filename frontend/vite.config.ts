import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import viteCompression from "vite-plugin-compression";

// Tenant-aware HTML injection for view-source (dev)
// Faz view-source em http://hair.localhost:4000/cursos ser dinâmico por tenant,
// igual sitemap/robots. Em prod o frontend/nginx.conf faz o mesmo via proxy.
function tenantHtmlInject() {
  return {
    name: 'tenant-html-inject',
    enforce: 'pre',
    configureServer(server) {
      const handler = async (req, res, next) => {
        const url = (req.url || '').split('?')[0];
        const accept = (req.headers.accept as string) || '';
        // só HTML, não assets/vite/api/websocket
        if (!accept.includes('text/html')) return next();
        if (url.startsWith('/@vite') || url.startsWith('/@react-refresh') || url.startsWith('/src/') || url.startsWith('/node_modules') || url.startsWith('/__vite')) return next();
        if (/\.(js|css|ts|tsx|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|json|map|mp4|webm)$/.test(url)) return next();
        if (url.startsWith('/api/')) return next();
        if (url === '/sitemap.xml' || url === '/robots.txt') return next();
        if (req.headers['sec-websocket-key']) return next();
        const host = (req.headers.host as string) || 'localhost';
        const fullUrl = `http://${host}${req.url || '/'}`;
        try {
          // Em dev o Host 127.0.0.1 é central e seria bloqueado por PreventAccessFromCentralDomains,
          // então usa rota central que resolve tenant via ?url host (fallback em OptionController)
          const backend = `http://127.0.0.1:8002/api/central/crawler-preview?url=${encodeURIComponent(fullUrl)}`;
          const r = await fetch(backend);
          if (r.ok) {
            const html = await r.text();
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(html);
            return;
          } else {
            console.warn(`[tenant-html] backend ${r.status} for ${fullUrl}`);
          }
        } catch (e) {
          console.warn('[tenant-html] fetch failed', e);
        }
        return next();
      };
      // Inserir no topo da pilha para interceptar antes do fallback SPA do Vite
      // @ts-ignore - stack é interno do connect
      if (server.middlewares && (server.middlewares as any).stack) {
        (server.middlewares as any).stack.unshift({ route: '', handle: handler });
      } else {
        server.middlewares.use(handler);
      }
    },
  };
}

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
    tenantHtmlInject(),
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
