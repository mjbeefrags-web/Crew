import type { PluginOption } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig(async ({ mode }) => {
  const plugins: PluginOption[] = [react(), tailwindcss()];

  // The Cloudflare plugin eagerly loads workerd, whose native binary is an
  // optional dependency. Docker serves the same static assets through Nginx,
  // and Vitest never needs a Workers runtime, so skip it there. Cloudflare
  // builds and local development keep the plugin.
  if (mode !== 'test' && process.env.BUILD_TARGET !== 'docker') {
    const { cloudflare } = await import('@cloudflare/vite-plugin');
    plugins.push(cloudflare());
  }

  if (process.env.BUILD_ANALYZE === '1') {
    const { visualizer } = await import('rollup-plugin-visualizer');
    plugins.push(
      visualizer({
        filename: 'bundle-report.html',
        gzipSize: true,
        brotliSize: true,
      }),
    );
  }

  return {
    plugins,
    build: {
      // Isolate the heavy Three.js runtime so the storefront entry only loads
      // it when a 3D route needs it (and the base bundle drops sharply).
      rollupOptions: {
        output: {
          manualChunks(id: string) {
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
  };
});
