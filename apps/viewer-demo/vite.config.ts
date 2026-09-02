import { createRequire } from 'node:module'
import { fileURLToPath, URL } from 'node:url'

import type { Alias, Plugin, UserConfigExport } from 'vite'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { createOfflineAssetSanitizerPlugin } from '../../packages/components/web-full/scripts/offline-asset-sanitize.mjs'

const require = createRequire(import.meta.url)

const exactPackageAlias = (packageName: string, replacement: string): Alias => ({
  find: new RegExp(`^${packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
  replacement
})

const demoWorkspaceSourceAliases = [
  ['@file-viewer/preset-all', '../../packages/presets/all/src/index.ts'],
  ['@file-viewer/renderer-3d', '../../packages/renderers/3d/src/index.ts'],
  ['@file-viewer/renderer-archive', '../../packages/renderers/archive/src/index.ts'],
  ['@file-viewer/renderer-cad', '../../packages/renderers/cad/src/index.ts'],
  ['@file-viewer/renderer-data', '../../packages/renderers/data/src/index.ts'],
  ['@file-viewer/renderer-design', '../../packages/renderers/design/src/index.ts'],
  ['@file-viewer/renderer-dicom', '../../packages/renderers/dicom/src/index.ts'],
  ['@file-viewer/renderer-drawing', '../../packages/renderers/drawing/src/index.ts'],
  ['@file-viewer/renderer-eda', '../../packages/renderers/eda/src/index.ts'],
  ['@file-viewer/renderer-email', '../../packages/renderers/email/src/index.ts'],
  ['@file-viewer/renderer-epub', '../../packages/renderers/ebook/src/index.ts'],
  ['@file-viewer/renderer-geo', '../../packages/renderers/geo/src/index.ts'],
  ['@file-viewer/renderer-image', '../../packages/renderers/image/src/index.ts'],
  ['@file-viewer/renderer-media', '../../packages/renderers/media/src/index.ts'],
  ['@file-viewer/renderer-mindmap', '../../packages/renderers/mindmap/src/index.ts'],
  ['@file-viewer/renderer-ofd', '../../packages/renderers/ofd/src/index.ts'],
  ['@file-viewer/renderer-pdf', '../../packages/renderers/pdf/src/index.ts'],
  ['@file-viewer/renderer-presentation', '../../packages/renderers/presentation/src/index.ts'],
  ['@file-viewer/renderer-signature', '../../packages/renderers/signature/src/index.ts'],
  ['@file-viewer/renderer-spreadsheet', '../../packages/renderers/spreadsheet/src/index.ts'],
  ['@file-viewer/renderer-text', '../../packages/renderers/text/src/index.ts'],
  ['@file-viewer/renderer-typst', '../../packages/renderers/typst/src/index.ts'],
  ['@file-viewer/renderer-word', '../../packages/renderers/word/src/index.ts']
] as const

const viewerQueryFallbackPlugin = (): Plugin => ({
  name: 'viewer-query-fallback',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      // Vite 会把根路径 `?url=` 当成资源查询；Demo 需要保留直接预览参数入口。
      if (req.url?.startsWith('/?url=')) {
        req.url = `/index.html${req.url.slice(1)}`
      }
      next()
    })
  }
})

const pptBundledRuntimeAssetUrlPlugin = (): Plugin => ({
  name: 'file-viewer-ppt-bundled-runtime-assets',
  enforce: 'pre',
  transform(code, id) {
    const normalizedId = id.split('?', 1)[0]?.replace(/\\/g, '/') || ''
    if (!normalizedId.endsWith('/@file-viewer/ppt/index.mjs')) {
      return undefined
    }

    // Bundle the PPT JavaScript entry so generic static servers never need to
    // serve a native ESM module with the correct MIME type. Point its default
    // asset URLs at the one authoritative vendor/ppt tree instead of letting
    // Vite emit a second hashed WASM/font/Worker copy.
    const runtimeBase = "(typeof document === 'undefined' ? import.meta.url : document.baseURI)"
    const replacements = [
      [
        "new URL('./ppt-native.wasm', import.meta.url)",
        `new URL('vendor/ppt/ppt-native.wasm', ${runtimeBase})`
      ],
      [
        'new URL(`./${MANIFEST.fontPack.file}`, import.meta.url)',
        `new URL(\`vendor/ppt/\${MANIFEST.fontPack.file}\`, ${runtimeBase})`
      ],
      [
        'new URL(`./${MANIFEST.workerFile}`, import.meta.url)',
        `new URL(\`vendor/ppt/\${MANIFEST.workerFile}\`, ${runtimeBase})`
      ]
    ] as const
    let transformed = code
    for (const [source, target] of replacements) {
      if (!transformed.includes(source)) {
        throw new Error(`@file-viewer/ppt runtime asset expression changed: ${source}`)
      }
      transformed = transformed.replace(source, target)
    }
    return { code: transformed, map: null }
  }
})

// https://vitejs.dev/config/
export default defineConfig(ctx => {
  const alias: Alias[] = [
    { find: '@/package', replacement: fileURLToPath(new URL('../../packages/components/vue3/src/package', import.meta.url)) },
    { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
    exactPackageAlias('@file-viewer/vue3', fileURLToPath(new URL('../../packages/components/vue3/src/package/index.ts', import.meta.url))),
    exactPackageAlias('@file-viewer/web', fileURLToPath(new URL('../../packages/components/web/src/index.ts', import.meta.url))),
    exactPackageAlias('@flyfish-group/file-viewer3', fileURLToPath(new URL('../../packages/components/vue3/src/package/index.ts', import.meta.url))),
    exactPackageAlias('buffer', require.resolve('buffer/')),
    exactPackageAlias('events', require.resolve('events/')),
    exactPackageAlias('path', require.resolve('path-browserify')),
    exactPackageAlias('react/jsx-dev-runtime', require.resolve('react/jsx-dev-runtime')),
    exactPackageAlias('react/jsx-runtime', require.resolve('react/jsx-runtime')),
    exactPackageAlias('react', require.resolve('react')),
    exactPackageAlias('react-dom', require.resolve('react-dom')),
    exactPackageAlias('stream', require.resolve('stream-browserify'))
  ]

  // Do not alias Node's zlib globally. dicom-parser receives a deterministic
  // pako inflater, while browserify-zlib eagerly imports Node util and crashes
  // Vite dev sessions before a local DICOM can mount.

  if (ctx.mode !== 'lib') {
    alias.push(
      exactPackageAlias('@file-viewer/core/assets', fileURLToPath(new URL('../../packages/core/src/assets.ts', import.meta.url))),
      exactPackageAlias('@file-viewer/core/browser', fileURLToPath(new URL('../../packages/core/src/browser.ts', import.meta.url))),
      exactPackageAlias('@file-viewer/core', fileURLToPath(new URL('../../packages/core/src/index.ts', import.meta.url)))
    )
    for (const [packageName, sourcePath] of demoWorkspaceSourceAliases) {
      alias.push(exactPackageAlias(packageName, fileURLToPath(new URL(sourcePath, import.meta.url))))
    }
    if (ctx.command === 'serve') {
      // slideshow-test.ts is an app-level development entry, so pnpm cannot
      // resolve the renderer's transitive workspace dependency from there.
      // Keep this source alias out of production builds: the published PPTX
      // package owns its Worker URL and must preserve that package boundary.
      alias.push(exactPackageAlias('@file-viewer/pptx', fileURLToPath(new URL('../../packages/renderers/pptx/src/index.ts', import.meta.url))))
    }
  }
  const config: UserConfigExport = {
    plugins: [
      viewerQueryFallbackPlugin(),
      pptBundledRuntimeAssetUrlPlugin(),
      vue(),
      vueJsx(),
      createOfflineAssetSanitizerPlugin(
        fileURLToPath(new URL('./dist', import.meta.url)),
        { label: 'viewer-demo-offline-assets' }
      )
    ],
    base: './',
    define: {
      global: 'globalThis'
    },
    resolve: {
      alias
    },
    optimizeDeps: {
      // Vite rewrites the package's dynamic default font URL into an overly
      // broad import.meta.glob while prebundling. Keep the small JavaScript
      // entry in the normal transform pipeline so the plugin above can point
      // all three runtime assets at the single public/vendor/ppt tree.
      exclude: ['@file-viewer/ppt']
    }
  }
  config.build = {
    manifest: 'file-viewer-manifest.json',
    // The demo already renders an inline boot shell. Avoid Vite/Rolldown eagerly
    // preloading the dynamically imported viewer shell and every shared helper.
    modulePreload: false,
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('index.html', import.meta.url)),
        compare: fileURLToPath(new URL('compare.html', import.meta.url)),
        iframe: fileURLToPath(new URL('iframe.html', import.meta.url)),
        'slideshow-test': fileURLToPath(new URL('slideshow-test.html', import.meta.url))
      }
    },
    outDir: 'dist'
  }

  return config
})
