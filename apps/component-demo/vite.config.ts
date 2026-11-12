import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineAssetSanitizerPlugin } from '../../packages/components/web-full/scripts/offline-asset-sanitize.mjs'
import { verifyPptRuntimeDistributionRoot } from '../../packages/components/web-full/scripts/ppt-runtime-integrity.mjs'

const demoRoot = fileURLToPath(new URL('.', import.meta.url))
const excalidrawStub = resolve(demoRoot, '../../packages/components/web/scripts/excalidraw-iife-stub.ts')
const pptPackagedRuntimeFallback = resolve(
  demoRoot,
  '../../packages/components/web-full/scripts/ppt-packaged-runtime-fallback.ts'
)

export default defineConfig({
  plugins: [
    createOfflineAssetSanitizerPlugin(resolve(demoRoot, 'dist'), {
      label: 'component-demo-offline-assets'
    }),
    {
      name: 'component-demo-ppt-runtime-integrity',
      async closeBundle() {
        await verifyPptRuntimeDistributionRoot(resolve(demoRoot, 'dist'), {
          runtimePrefix: 'file-viewer/vendor/ppt',
          forbidBundledJavaScript: true
        })
      }
    }
  ],
  resolve: {
    alias: {
      // The component demo publishes script-tag and framework examples together.
      // Keep its production build independent from Excalidraw's React peers and
      // let core render .excalidraw through the built-in offline SVG fallback.
      '@excalidraw/excalidraw': excalidrawStub,
      // Full integrations always use /file-viewer/vendor/ppt. Keep the
      // renderer's unreachable bare-import fallback out of the static demo.
      '@file-viewer/ppt': pptPackagedRuntimeFallback
    }
  },
  server: {
    host: '127.0.0.1'
  },
  preview: {
    host: '127.0.0.1'
  },
  build: {
    rollupOptions: {
      input: {
        index: resolve(demoRoot, 'index.html'),
        jquery: resolve(demoRoot, 'jquery.html'),
        'custom-element': resolve(demoRoot, 'custom-element.html'),
        'manual-js': resolve(demoRoot, 'manual-js.html'),
        'manual-iife': resolve(demoRoot, 'manual-iife.html'),
        'svelte-action': resolve(demoRoot, 'svelte-action.html'),
        vue3: resolve(demoRoot, 'vue3.html'),
        requirejs: resolve(demoRoot, 'requirejs.html')
      }
    }
  }
})
