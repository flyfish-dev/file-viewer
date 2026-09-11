import { existsSync } from 'node:fs'
import { mkdir, readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const requestedPackageDir = process.argv[2]

if (!requestedPackageDir) {
  throw new Error('Usage: node scripts/build-web-iife.mjs <package-directory>')
}

const packageDir = resolve(repositoryRoot, requestedPackageDir)
const packageJsonPath = join(packageDir, 'package.json')
const entry = join(packageDir, 'src', 'global.ts')
const outDir = join(packageDir, 'dist')
const fileName = 'flyfish-file-viewer-web.iife.js'
const standardWebEntry = join(repositoryRoot, 'packages', 'components', 'web', 'src', 'index.ts')
const excalidrawStub = join(
  repositoryRoot,
  'packages',
  'components',
  'web',
  'scripts',
  'excalidraw-iife-stub.ts'
)

for (const [label, path] of [
  ['package.json', packageJsonPath],
  ['web global entry', entry],
  ['standard @file-viewer/web entry', standardWebEntry],
  ['Excalidraw IIFE stub', excalidrawStub]
]) {
  if (!existsSync(path)) throw new Error(`Missing ${label}: ${path}`)
}

const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'))
if (packageJson.name !== '@flyfish-group/file-viewer-web') {
  throw new Error(
    `build-web-iife.mjs expected @flyfish-group/file-viewer-web, got ${String(packageJson.name)}`
  )
}

// Resolve Vite from the package that declares it instead of from the repository
// root. This keeps the helper compatible with pnpm's strict node_modules layout.
const packageRequire = createRequire(packageJsonPath)
const viteEntry = packageRequire.resolve('vite')
const { build } = await import(pathToFileURL(viteEntry).href)

await mkdir(outDir, { recursive: true })

await build({
  root: packageDir,
  configFile: false,
  publicDir: false,
  logLevel: 'warn',
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env': JSON.stringify({ NODE_ENV: 'production' })
  },
  resolve: {
    alias: {
      // The compatibility package is a thin wrapper over the canonical web
      // component. Bundle the workspace source directly so this build does not
      // depend on a pre-existing @file-viewer/web dist directory.
      '@file-viewer/web': standardWebEntry,
      // Keep the script-tag build framework-free just like the canonical web
      // IIFE build; Excalidraw's official package otherwise pulls React peers.
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

console.log(`[web-iife] Built ${join(outDir, fileName)}`)
