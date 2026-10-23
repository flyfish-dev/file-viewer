import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { writeBundleInventory } from '../packages/build-support/bundle-inventory.mjs'
import { writeBundleNotices } from '../packages/build-support/bundle-notices.mjs'
import { bundleInputPlugin } from '../packages/build-support/rollup-bundle-inputs.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '../..')
const packageDir = resolve(sourceRoot, process.argv[2] || 'packages/compat/web')
const entry = join(packageDir, 'src', 'global.ts')
const excalidrawStub = join(scriptDir, 'excalidraw-iife-stub.ts')
const outDir = join(packageDir, 'dist')
const fileName = 'flyfish-file-viewer-web.iife.js'
const bundledInputs = new Set()
const requireFromPackage = createRequire(join(packageDir, 'package.json'))

if (!existsSync(entry)) {
  throw new Error(`Missing web global entry: ${entry}`)
}

await mkdir(outDir, { recursive: true })

const { build } = await import(requireFromPackage.resolve('vite'))

await build({
  configFile: false,
  publicDir: false,
  logLevel: 'warn',
  plugins: [bundleInputPlugin(bundledInputs)],
  worker: { plugins: () => [bundleInputPlugin(bundledInputs)] },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env': JSON.stringify({ NODE_ENV: 'production' })
  },
  resolve: {
    alias: {
      // Keep script-tag compatibility bundles framework-free. The official
      // Excalidraw exporter depends on React peers, while core already has a
      // built-in SVG fallback for this exact lightweight/offline scenario.
      '@excalidraw/excalidraw': excalidrawStub
    },
    dedupe: ['@file-viewer/core']
  },
  build: {
    emptyOutDir: false,
    minify: 'esbuild',
    sourcemap: false,
    target: 'es2019',
    lib: {
      entry,
      name: 'FlyfishFileViewerWeb',
      formats: ['iife'],
      fileName: () => fileName
    },
    rollupOptions: {
      output: {
        exports: 'named',
        extend: true
      }
    }
  }
})

await writeBundleInventory([...bundledInputs], join(packageDir, '.build/iife-inputs.json'))
await writeBundleNotices(
  { inputs: Object.fromEntries([...bundledInputs].map((path) => [path, {}])) },
  join(outDir, 'THIRD_PARTY_LICENSES.txt')
)

console.log(`[web-iife] Built ${join(outDir, fileName)}`)
