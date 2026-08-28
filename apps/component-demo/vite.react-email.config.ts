import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineAssetSanitizerPlugin } from '../../packages/components/web-full/scripts/offline-asset-sanitize.mjs'

const demoRoot = fileURLToPath(new URL('.', import.meta.url))
const excalidrawStub = resolve(
  demoRoot,
  '../../packages/components/web/scripts/excalidraw-iife-stub.ts'
)
const pptPackagedRuntimeFallback = resolve(
  demoRoot,
  '../../packages/components/web-full/scripts/ppt-packaged-runtime-fallback.ts'
)
const react17Root = resolve(demoRoot, 'node_modules/react17')

export default defineConfig({
  plugins: [
    createOfflineAssetSanitizerPlugin(resolve(demoRoot, 'dist'), {
      label: 'component-react-email-offline-assets'
    })
  ],
  resolve: {
    alias: [
      { find: /^react$/u, replacement: resolve(react17Root, 'index.js') },
      { find: /^react\/jsx-runtime$/u, replacement: resolve(react17Root, 'jsx-runtime.js') },
      {
        find: /^react\/jsx-dev-runtime$/u,
        replacement: resolve(react17Root, 'jsx-dev-runtime.js')
      },
      {
        find: /^react-dom$/u,
        replacement: resolve(demoRoot, 'node_modules/react-dom17/index.js')
      },
      { find: '@excalidraw/excalidraw', replacement: excalidrawStub },
      { find: '@file-viewer/ppt', replacement: pptPackagedRuntimeFallback }
    ]
  },
  server: { host: '127.0.0.1' },
  preview: { host: '127.0.0.1' },
  build: {
    emptyOutDir: false,
    rollupOptions: {
      input: { 'react-email': resolve(demoRoot, 'react-email.html') }
    }
  }
})
