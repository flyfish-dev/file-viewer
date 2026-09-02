import { existsSync } from 'node:fs'
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import { sanitizeOfflineViewerAssetTree } from './offline-asset-sanitize.mjs'
import { verifyPptRuntimeDistributionRoot } from './ppt-runtime-integrity.mjs'

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packageManifest = JSON.parse(await readFile(resolve(packageDir, 'package.json'), 'utf8'))
const entry = join(packageDir, 'src', 'global.ts')
const excalidrawStub = resolve(packageDir, '..', 'web', 'scripts', 'excalidraw-iife-stub.ts')
const pptPackagedRuntimeFallback = resolve(packageDir, 'scripts', 'ppt-packaged-runtime-fallback.ts')
const outDir = join(packageDir, 'dist')
const fileName = 'flyfish-file-viewer-web-full.iife.js'
const rendererOutDir = join(outDir, 'renderers')
const generatedDir = join(packageDir, '.generated-iife-renderers')

const rendererBuilds = [
  { key: 'word', packageName: '@file-viewer/renderer-word', exportName: 'wordRenderer', globalName: 'FlyfishFileViewerWebFullRendererWord' },
  {
    key: 'pdf',
    packageName: '@file-viewer/renderer-pdf',
    exportName: 'pdfRenderer',
    globalName: 'FlyfishFileViewerWebFullRendererPdf',
    sideEffectImports: ['@file-viewer/capability-pdf-identity-repair']
  },
  { key: 'ofd', packageName: '@file-viewer/renderer-ofd', exportName: 'ofdRenderer', globalName: 'FlyfishFileViewerWebFullRendererOfd' },
  { key: 'presentation', packageName: '@file-viewer/renderer-presentation', exportName: 'presentationRenderer', globalName: 'FlyfishFileViewerWebFullRendererPresentation' },
  { key: 'spreadsheet', packageName: '@file-viewer/renderer-spreadsheet', exportName: 'spreadsheetRenderer', globalName: 'FlyfishFileViewerWebFullRendererSpreadsheet' },
  { key: 'iwork', packageName: '@file-viewer/renderer-iwork', exportName: 'iworkRenderer', globalName: 'FlyfishFileViewerWebFullRendererIwork' },
  { key: 'wordperfect', packageName: '@file-viewer/renderer-wordperfect', exportName: 'wordPerfectRenderer', globalName: 'FlyfishFileViewerWebFullRendererWordPerfect' },
  { key: 'hangul', packageName: '@file-viewer/renderer-hangul', exportName: 'hangulRenderer', globalName: 'FlyfishFileViewerWebFullRendererHangul' },
  { key: 'cad', packageName: '@file-viewer/renderer-cad', exportName: 'cadRenderer', globalName: 'FlyfishFileViewerWebFullRendererCad' },
  { key: 'typst', packageName: '@file-viewer/renderer-typst', exportName: 'typstRenderer', globalName: 'FlyfishFileViewerWebFullRendererTypst' },
  { key: 'drawing', packageName: '@file-viewer/renderer-drawing', exportName: 'drawingRenderer', globalName: 'FlyfishFileViewerWebFullRendererDrawing' },
  { key: 'model', packageName: '@file-viewer/renderer-3d', exportName: 'modelRenderer', globalName: 'FlyfishFileViewerWebFullRendererModel' },
  { key: 'archive', packageName: '@file-viewer/renderer-archive', exportName: 'archiveRenderer', globalName: 'FlyfishFileViewerWebFullRendererArchive' },
  { key: 'email', packageName: '@file-viewer/renderer-email', exportName: 'emailRenderer', globalName: 'FlyfishFileViewerWebFullRendererEmail' },
  { key: 'ebook', packageName: '@file-viewer/renderer-epub', exportName: 'ebookRenderer', globalName: 'FlyfishFileViewerWebFullRendererEbook' },
  { key: 'text', packageName: '@file-viewer/renderer-text', exportName: 'textRenderer', globalName: 'FlyfishFileViewerWebFullRendererText' },
  { key: 'image', packageName: '@file-viewer/renderer-image', exportName: 'imageRenderer', globalName: 'FlyfishFileViewerWebFullRendererImage' },
  { key: 'media', packageName: '@file-viewer/renderer-media', exportName: 'mediaRenderer', globalName: 'FlyfishFileViewerWebFullRendererMedia' },
  { key: 'mindmap', packageName: '@file-viewer/renderer-mindmap', exportName: 'mindmapRenderer', globalName: 'FlyfishFileViewerWebFullRendererMindmap' },
  { key: 'geo', packageName: '@file-viewer/renderer-geo', exportName: 'geoRenderer', globalName: 'FlyfishFileViewerWebFullRendererGeo' },
  { key: 'data', packageName: '@file-viewer/renderer-data', exportName: 'dataRenderer', globalName: 'FlyfishFileViewerWebFullRendererData' },
  { key: 'eda', packageName: '@file-viewer/renderer-eda', exportName: 'edaRenderer', globalName: 'FlyfishFileViewerWebFullRendererEda' }
]

if (!existsSync(entry)) {
  throw new Error(`Missing web full global entry: ${entry}`)
}

await mkdir(outDir, { recursive: true })
await rm(rendererOutDir, { recursive: true, force: true })
await mkdir(rendererOutDir, { recursive: true })

await build({
  base: './',
  configFile: false,
  publicDir: false,
  logLevel: 'warn',
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env': JSON.stringify({ NODE_ENV: 'production' }),
    'import.meta.url': 'document.currentScript?.src || location.href'
  },
  resolve: {
    alias: {
      // Keep the CDN full bundle usable without React peer dependencies.
      '@excalidraw/excalidraw': excalidrawStub
    },
    dedupe: ['@file-viewer/core']
  },
  build: {
    emptyOutDir: false,
    minify: 'esbuild',
    sourcemap: false,
    target: 'es2020',
    lib: {
      entry,
      name: 'FlyfishFileViewerWebFull',
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

await rm(generatedDir, { recursive: true, force: true })
await mkdir(generatedDir, { recursive: true })

for (const renderer of rendererBuilds) {
  const rendererEntry = join(generatedDir, `${renderer.key}.ts`)
  const sideEffectImports = (renderer.sideEffectImports || [])
    .map(packageName => `import '${packageName}'`)
    .join('\n')
  await writeFile(rendererEntry, `
${sideEffectImports}
import { ${renderer.exportName} as renderer } from '${renderer.packageName}'

const host = globalThis
const bucket = host.FlyfishFileViewerWebFullRenderers || (host.FlyfishFileViewerWebFullRenderers = {})
bucket['${renderer.key}'] = renderer
bucket[renderer.id] = renderer
`, 'utf8')

  await build({
    base: './',
    configFile: false,
    publicDir: false,
    logLevel: 'warn',
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
      'process.env': JSON.stringify({ NODE_ENV: 'production' }),
      'import.meta.url': 'document.currentScript?.src || location.href'
    },
    resolve: {
      alias: {
        '@excalidraw/excalidraw': excalidrawStub,
        '@file-viewer/ppt': pptPackagedRuntimeFallback
      },
      dedupe: ['@file-viewer/core']
    },
    build: {
      emptyOutDir: false,
      minify: 'esbuild',
      outDir: rendererOutDir,
      sourcemap: false,
      target: 'es2020',
      lib: {
        entry: rendererEntry,
        name: renderer.globalName,
        formats: ['iife'],
        fileName: () => `${renderer.key}.iife.js`
      },
      rollupOptions: {
        output: {
          exports: 'none',
          extend: true
        }
      }
    }
  })
}

await rm(generatedDir, { recursive: true, force: true })

const assetSourceCandidates = [
  resolve(packageDir, '..', 'web', 'viewer'),
  resolve(packageDir, '..', '..', 'compat', 'web', 'viewer'),
  resolve(packageDir, '..', '..', '..', 'apps', 'viewer-demo', 'dist'),
  // A fresh public-source checkout has no generated viewer/demo dist yet. The
  // tracked offline assets are the canonical bootstrap source for that build.
  resolve(packageDir, '..', '..', '..', 'apps', 'viewer-demo', 'public')
]
const assetSource = assetSourceCandidates.find(candidate =>
  existsSync(resolve(candidate, 'flyfish-viewer-assets.json')) ||
  existsSync(resolve(candidate, 'vendor')) ||
  existsSync(resolve(candidate, 'wasm'))
)

if (assetSource) {
  for (const entry of [
    'vendor',
    'wasm',
    'flyfish-viewer-assets.json',
    'flyfish-viewer-manifest.json'
  ]) {
    const sourcePath = resolve(assetSource, entry)
    if (!existsSync(sourcePath)) {
      continue
    }
    const targetPath = resolve(outDir, entry)
    await rm(targetPath, { recursive: true, force: true })
    await cp(sourcePath, targetPath, { recursive: true })
  }
  await writeFile(
    resolve(outDir, 'flyfish-viewer-manifest.json'),
    `${JSON.stringify({
      name: packageManifest.name,
      version: packageManifest.version,
      kind: 'viewer-assets',
      assets: 'flyfish-viewer-assets.json'
    }, null, 2)}\n`,
    'utf8'
  )
  console.log(`[web-full-iife] Copied viewer assets from ${assetSource}`)
} else {
  console.warn('[web-full-iife] Viewer assets were not copied. Run pnpm build:viewer-assets before publishing the full CDN package.')
}

const sanitization = await sanitizeOfflineViewerAssetTree(outDir)
await verifyPptRuntimeDistributionRoot(outDir, {
  unbundledJavaScriptPath: 'renderers/presentation.iife.js'
})
console.log(
  `[web-full-iife] Sanitized ${sanitization.checkedFiles} shipped text assets; ` +
  `replaced ${sanitization.replacementCount} public runtime fallback markers in ` +
  `${sanitization.touchedFiles.length} files`
)
if (sanitization.touchedFiles.length) {
  console.log(
    `[web-full-iife] Localized public fallback markers in: ${sanitization.touchedFiles
      .map(file => relative(packageDir, file).replaceAll('\\', '/'))
      .join(', ')}`
  )
}

console.log(`[web-full-iife] Built ${join(outDir, fileName)} and ${rendererBuilds.length} async renderer bundles`)
