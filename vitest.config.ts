import { configDefaults, defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';
import { createRequire } from 'node:module';

const testRequire = createRequire(new URL('./package.json', import.meta.url));
const ebookRequire = createRequire(new URL('./packages/renderers/ebook/package.json', import.meta.url));
const vue3Require = createRequire(new URL('./packages/components/vue3/package.json', import.meta.url));
const vuePlugin = vue3Require('@vitejs/plugin-vue') as () => import('vite').Plugin;

export default defineConfig({
  plugins: [vuePlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./apps/viewer-demo/src', import.meta.url)),
      '@file-viewer/core/assets': fileURLToPath(new URL('./packages/core/src/assets.ts', import.meta.url)),
      '@file-viewer/core/browser': fileURLToPath(new URL('./packages/core/src/browser.ts', import.meta.url)),
      '@file-viewer/core': fileURLToPath(new URL('./packages/core/src/index.ts', import.meta.url)),
      '@file-viewer/vue3': fileURLToPath(
        new URL('./packages/components/vue3/src/package/index.ts', import.meta.url),
      ),
      linkedom: testRequire.resolve('linkedom'),
      pako: ebookRequire.resolve('pako'),
      'msdoc-viewer': fileURLToPath(
        new URL('./packages/compat/msdoc-viewer/src/index.ts', import.meta.url),
      ),
      'vue/server-renderer': vue3Require.resolve('vue/server-renderer'),
      vue: vue3Require.resolve('vue'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}', 'test/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    // These suites use node:test and run through test:native-regressions in pnpm test.
    exclude: [
      ...configDefaults.exclude,
      'test/container-compatibility/pictures.test.mjs',
      'test/docx-chart-axes/date-format.test.mjs',
      'test/docx-grid-metrics/inline.test.mjs',
    ],
  },
});
