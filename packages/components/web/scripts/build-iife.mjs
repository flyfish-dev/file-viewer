import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import { isolateAmd, writeAmdEntry } from './amd-entry.mjs'

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const entry = join(packageDir, 'src', 'global.ts')
const excalidrawStub = join(packageDir, 'scripts', 'excalidraw-iife-stub.ts')
const outDir = join(packageDir, 'dist')
const fileName = 'flyfish-file-viewer-web.iife.js'

if (!existsSync(entry)) {
  throw new Error(`Missing web global entry: ${entry}`)
}

await mkdir(outDir, { recursive: true })

await build({
  configFile: false,
  publicDir: false,
  logLevel: 'warn',
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env': JSON.stringify({ NODE_ENV: 'production' })
  },
  resolve: {
    alias: {
      // The script-tag/IIFE bundle must stay framework-free. The official
      // Excalidraw export package pulls React peer dependencies, so the IIFE
      // build intentionally falls back to core's built-in rough.js renderer.
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
        ...isolateAmd,
        exports: 'named',
        extend: true
      }
    }
  }
})

await writeAmdEntry(join(outDir, fileName), 'FlyfishFileViewerWeb')

console.log(`[web-iife] Built ${join(outDir, fileName)}`)
