import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
export default defineConfig({
  resolve: {
    alias: {
      '@file-viewer/core': fileURLToPath(new URL('./packages/core/src/index.ts', import.meta.url)),
      '@signature-under-test':
        process.env.SIGNATURE_LIFECYCLE_SOURCE ||
        fileURLToPath(new URL('./packages/renderers/signature/src/signature.ts', import.meta.url))
    }
  },
  test: {
    environment: 'jsdom',
    include: ['test/signature-details-lifecycle.spec.ts']
  }
})
