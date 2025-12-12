import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
/**
 * Vite config: sets dev server host/port.
 * - Host "::" to bind IPv6/IPv4 on Windows.
 * - Port 8081 to avoid conflict with other services using 8080.
 */
export default defineConfig(({ mode }) => ({
  server: {
    // Bind to localhost to avoid DNS issues on Windows
    host: true,
    port: 4000,
    strictPort: true,
    // Use default HMR settings (auto)
  },
  build: {
    // pt-BR: Ajusta aviso de tamanho e cria chunks menores para vendors.
    // en-US: Adjusts warning limit and creates smaller vendor chunks.
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
            // Agrupa radix-ui/shadcn para reduzir bundle inicial da página
            if (id.includes('@radix-ui')) return 'radix';
          }
        },
      },
    },
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
