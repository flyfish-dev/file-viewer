import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '@signature-under-test': fileURLToPath(
        new URL('./packages/renderers/signature/src/signature.ts', import.meta.url)
      ),
      '@file-viewer/core': fileURLToPath(new URL('./packages/core/src/index.ts', import.meta.url))
    }
  },
  test: {
    environment: 'jsdom',
    include: ['test/signature-details-panel.spec.ts', 'test/signature-details-lifecycle.spec.ts']
  }
})
