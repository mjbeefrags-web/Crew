import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
  build: {
    // Isolate the heavy Three.js runtime so the storefront entry only loads
    // it when a 3D route needs it (and the base bundle drops sharply).
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/three/build/')) return 'three';
          if (id.includes('three')) return 'three';
        },
      },
    },
    // Three.js is deliberately loaded as an on-demand chunk; allow its size.
    chunkSizeWarningLimit: 700,
  },
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: true,
    // WebGL-heavy component tests starve under the default worker count.
    maxWorkers: 4,
  },
});