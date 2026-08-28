# Vue 2 Integration

<div class="doc-kicker">Vue 2.7 And Vue 2.6</div>

<p class="doc-lead">
  Vue 2 projects can use native component packages without switching to an iframe-only integration.
</p>

> Vue 2 is upstream end-of-life. File Viewer will keep its Vue 2.6/2.7 compatibility packages, but new applications should prefer Vue 3. Security-sensitive legacy applications should also assess the host framework's [GHSA-5j4c-8p2g-v4jx](https://github.com/advisories/GHSA-5j4c-8p2g-v4jx), because no patched Vue 2 release is available.

## Vue 2.7

```bash
npm install @file-viewer/vue2.7 @file-viewer/preset-office
```

Installing only `@file-viewer/vue2.7` gives you the lightest native Vue 2.7 component. Add presets or renderer packages for concrete PDF, Office, CAD, Typst, archive, and engineering formats. For Webpack, Rspack, Rollup, Umi, and non-Vite applications, pass the capability through `options.preset`:

```ts
import officePreset from '@file-viewer/preset-office'

const viewerOptions = {
  preset: officePreset,
  rendererMode: 'replace',
  theme: 'light',
  styleIsolation: 'shadow',
  toolbar: { position: 'bottom-right' }
}
```

Vue 2 uses Shadow DOM by default so aggressive global CSS, low-code resets, and micro-frontend styles cannot break the viewer. Use `styleIsolation:'none'` only for legacy deep class overrides. See [Style Isolation And Customization](/guide/style-isolation) for tokens and `::part()` customization.

Vite projects can add the plugin to avoid manual preset imports. Installing the package alone is not enough because Vite plugins must be registered once; after registration the plugin auto-discovers installed presets:

```bash
npm install -D @file-viewer/vite-plugin
```

```ts
import { defineConfig } from 'vite'
import { fileViewerRenderers } from '@file-viewer/vite-plugin'

export default defineConfig({
  plugins: [
    fileViewerRenderers({
      copyAssets: true
    })
  ]
})
```

```ts
import Vue from 'vue'
import FileViewer from '@file-viewer/vue2.7'

Vue.use(FileViewer)
```

```vue
<template>
  <div class="preview-shell">
    <file-viewer
      url="/files/report.pdf"
      :options="viewerOptions"
      @viewer-event="onViewerEvent"
    />
  </div>
</template>

<script>
import officePreset from '@file-viewer/preset-office'

export default {
  data() {
    return {
      viewerOptions: {
        preset: officePreset,
        rendererMode: 'replace',
        theme: 'light',
        toolbar: { position: 'bottom-right' }
      }
    }
  },
  methods: {
    onViewerEvent(event) {
      console.log(event.type)
    }
  }
}
</script>
```

## Vue 2.6

```bash
npm install @file-viewer/vue2.6 @file-viewer/preset-office
```

Use the same component API as Vue 2.7. Keep your host container at a fixed or viewport-relative height. Switch `@file-viewer/preset-office` to `@file-viewer/preset-all` when heavy users need the full format matrix in one install:

```bash
npm install @file-viewer/vue2.6 @file-viewer/preset-all
```

Full packages are also available when you want the complete matrix by default: use `@file-viewer/vue2.7-full` for Vue 2.7 and `@file-viewer/vue2.6-full` for Vue 2.6.

```bash
npm install @file-viewer/vue2.7-full
```

```ts
import Vue from 'vue'
import FileViewer from '@file-viewer/vue2.7-full'

Vue.use(FileViewer)
```

`@file-viewer/vue2.7-full` and `@file-viewer/vue2.6-full` already include `preset-all`; do not install or pass it again. With the Vite configuration above, dev and build publish the complete matching assets automatically. Vue CLI, webpack 4, Rspack, Rollup, and other non-Vite projects run the Full package's included same-version CLI:

```bash
npx --no-install file-viewer-copy-assets ./public/file-viewer
```

Use `formats`, `renderers`, `scan:true`, `inject:false`, or `chunkStrategy:'renderer'` only for explicit registry control. Normal projects should keep `fileViewerRenderers({ copyAssets:true })` and let the plugin auto-activate installed presets.

## Vue 2.6 + Vue CLI 3 / webpack 4

If importing `@file-viewer/preset-office` breaks the build but commenting it out lets the app compile, the Vue 2.6 component is usually not the failing part. The office preset pulls PDF, Word, Excel, PPTX, and OFD renderer dependencies into the bundle; Vue CLI 3 / webpack 4 does not transpile `node_modules` by default and does not understand every package `exports` subpath or `import.meta.url` worker pattern.

The repository includes a standalone runnable demo based on this legacy stack:

```bash
cd examples/vue2.6-cli3-office
npm install
npm run serve
```

On Node 17+, webpack 4 may need:

```bash
NODE_OPTIONS=--openssl-legacy-provider npm run build
```

Prefer copying the demo `vue.config.js` first, then trim it after the customer build is stable. Current `@file-viewer/renderer-pdf` tarballs already isolate the staged PDF.js webpack runtime, so consumer projects must not add a loader for renderer-internal `dist/vendor/pdfjs` paths.

```js
// vue.config.js
const path = require('path')

const resolveApp = value => path.resolve(__dirname, value)
const resolvePackageRoot = packageName => path.dirname(require.resolve(`${packageName}/package.json`))
const resolvePackageFile = (packageName, relativePath) => path.join(resolvePackageRoot(packageName), relativePath)

module.exports = {
  transpileDependencies: [
    /@file-viewer/,
    /pdfjs-dist/,
    /e-virt-table/,
    /styled-exceljs/
  ],
  configureWebpack: {
    resolve: {
      alias: {
        '@file-viewer/core/assets$': resolvePackageFile('@file-viewer/core', 'dist/assets.js'),
        '@file-viewer/core/browser$': resolvePackageFile('@file-viewer/core', 'dist/browser.js'),
        '@file-viewer/core/headless$': resolvePackageFile('@file-viewer/core', 'dist/headless.js'),
        '@file-viewer/docx$': resolvePackageFile('@file-viewer/docx', 'dist/docx-preview.mjs')
      },
      extensions: ['.mjs', '.js', '.vue', '.json']
    }
  }
}
```

The renderer build isolates all four PDF.js runtime bindings (`modules`, `module_cache`, `exports`, and `require`) before publishing the tarball and records the source hash, transform count, and output hash in `dist/vendor/pdfjs/provenance.json`. This prevents PDF.js' inner webpack bootstrap from shadowing webpack 4's host exports. A project that separately imports `pdfjs-dist` source modules still owns compatibility for those direct imports; the File Viewer example uses that package only as a build-time source for copied static assets.

Keep the `@file-viewer/docx` alias too: webpack 4 otherwise prefers the UMD `browser` entry, whose CommonJS exports are lost after Babel transpilation and surface as `@file-viewer/docx did not expose a compatible renderAsync function` when a DOCX is uploaded. The other patch, `build/babel-transform-import-meta-url.cjs`, lets webpack 4 parse the PPTX worker module. The copy script publishes the complete nine-file `@file-viewer/ppt@0.3.3` runtime under `public/file-viewer/vendor/ppt/` together with the PPTX worker. The `serve` env files set `NODE_ENV=production` to avoid Vue CLI 3.1 injecting its HMR client into this legacy preview path.

Then pass the preset and self-hosted asset URLs explicitly:

```js
import officePreset from '@file-viewer/preset-office'

const assetBaseUrl = './file-viewer/'

export const viewerOptions = {
  preset: officePreset,
  rendererMode: 'replace',
  theme: 'light',
  styleIsolation: 'shadow',
  pdf: {
    workerUrl: `${assetBaseUrl}vendor/pdf/pdf.worker.mjs`,
    cMapUrl: `${assetBaseUrl}vendor/pdf/cmaps/`,
    wasmUrl: `${assetBaseUrl}vendor/pdf/wasm/`,
    standardFontDataUrl: `${assetBaseUrl}vendor/pdf/standard_fonts/`
  },
  docx: {
    workerUrl: `${assetBaseUrl}vendor/docx/docx.worker.js`,
    workerJsZipUrl: `${assetBaseUrl}vendor/docx/jszip.min.js`
  },
  presentation: {
    pptModuleUrl: `${assetBaseUrl}vendor/ppt/index.mjs`,
    pptWorkerUrl: `${assetBaseUrl}vendor/ppt/worker.mjs`,
    pptWasmUrl: `${assetBaseUrl}vendor/ppt/ppt-native.wasm`,
    pptFontUrl: `${assetBaseUrl}vendor/ppt/ppt-font-cjk.otf`,
    workerUrl: `${assetBaseUrl}vendor/pptx/pptx.worker.js`
  },
  spreadsheet: {
    workerUrl: `${assetBaseUrl}vendor/xlsx/sheet.worker.js`
  }
}
```

`preset-office` covers PDF, Word, spreadsheets, presentations, OFD, and OpenDocument. It intentionally does not include images or media. Add those renderers explicitly when the application also previews `.jpg` or `.mp4`, or combine the office and lite presets:

```js
import officePreset from '@file-viewer/preset-office'
import { imageRenderer } from '@file-viewer/renderer-image'
import { mediaRenderer } from '@file-viewer/renderer-media'

export const viewerOptions = {
  preset: officePreset,
  renderers: [imageRenderer, mediaRenderer],
  rendererMode: 'replace'
}
```

Those four `ppt*Url` values are only needed because this Vue CLI 3 compatibility example explicitly self-hosts assets from `public/file-viewer/`. The copy command and options file are already wired together; normal Vite/full-package installs publish and resolve the same packaged runtime automatically.

Vue CLI 3 / webpack 4 can keep working for modern browsers. If a project still requires IE11-level output or an old `uglifyjs-webpack-plugin` pass over the full office dependency graph, prefer upgrading the minifier/build chain or isolating the viewer through `@file-viewer/vue2.6-full` or the Web Component IIFE package.

## Historical Package

`@flyfish-group/file-viewer` remains the compatibility line for Vue 2.7. New projects should prefer `@file-viewer/vue2.7` or `@file-viewer/vue2.6`.
