import { createRequire } from 'node:module'
import { fileURLToPath, URL } from 'node:url'

import type { Plugin, UserConfigExport } from 'vite'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { createOfflineAssetSanitizerPlugin } from '../../packages/components/web-full/scripts/offline-asset-sanitize.mjs'

const require = createRequire(import.meta.url)

const demoWorkspaceSourceAliases = [
  ['@file-viewer/preset-all', '../../packages/presets/all/src/index.ts'],
  ['@file-viewer/renderer-3d', '../../packages/renderers/3d/src/index.ts'],
  ['@file-viewer/renderer-archive', '../../packages/renderers/archive/src/index.ts'],
  ['@file-viewer/renderer-cad', '../../packages/renderers/cad/src/index.ts'],
  ['@file-viewer/renderer-data', '../../packages/renderers/data/src/index.ts'],
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

// https://vitejs.dev/config/
export default defineConfig(ctx => {
  const alias: Record<string, string> = {
    '@/package': fileURLToPath(new URL('../../packages/components/vue3/src/package', import.meta.url)),
    '@': fileURLToPath(new URL('./src', import.meta.url)),
    '@file-viewer/vue3': fileURLToPath(new URL('../../packages/components/vue3/src/package/index.ts', import.meta.url)),
    '@file-viewer/web': fileURLToPath(new URL('../../packages/components/web/src/index.ts', import.meta.url)),
    '@flyfish-group/file-viewer3': fileURLToPath(new URL('../../packages/components/vue3/src/package/index.ts', import.meta.url)),
    buffer: require.resolve('buffer/'),
    events: require.resolve('events/'),
    path: require.resolve('path-browserify'),
    'react/jsx-dev-runtime': require.resolve('react/jsx-dev-runtime'),
    'react/jsx-runtime': require.resolve('react/jsx-runtime'),
    react: require.resolve('react'),
    'react-dom': require.resolve('react-dom'),
    stream: require.resolve('stream-browserify'),
    zlib: require.resolve('browserify-zlib')
  }

  if (ctx.mode !== 'lib') {
    alias['@file-viewer/core/assets'] = fileURLToPath(new URL('../../packages/core/src/assets.ts', import.meta.url))
    alias['@file-viewer/core/browser'] = fileURLToPath(new URL('../../packages/core/src/browser.ts', import.meta.url))
    alias['@file-viewer/core'] = fileURLToPath(new URL('../../packages/core/src/index.ts', import.meta.url))
    for (const [packageName, sourcePath] of demoWorkspaceSourceAliases) {
      alias[packageName] = fileURLToPath(new URL(sourcePath, import.meta.url))
    }
  }
  if (ctx.command === 'build') {
    // Production always points the presentation renderer at vendor/ppt. Alias
    // only its unreachable npm fallback so the demo does not ship a second,
    // hashed copy of the native WASM and CJK font.
    alias['@file-viewer/ppt'] = fileURLToPath(new URL(
      '../../packages/components/web-full/scripts/ppt-packaged-runtime-fallback.ts',
      import.meta.url
    ))
  }

  const config: UserConfigExport = {
    plugins: [
      viewerQueryFallbackPlugin(),
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
    }
  }
  config.build = {
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
