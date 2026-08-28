# Quickstart

<div class="doc-kicker">Get Running Fast</div>

<p class="doc-lead">
  If your first goal is to see the viewer running, this page starts with the shortest runnable path.
  Pick the native component package first, then add the preset or renderer that matches your file types; after that, tune on-demand assembly, offline assets, and toolbar behavior.
</p>

## Five-step Integration

| Step | Decision | Fast answer |
| --- | --- | --- |
| 1 | Pick the component package | Use standard packages such as `@file-viewer/web`, `@file-viewer/vue3`, or `@file-viewer/react` for the lightest entry; Full packages preserve the published compatibility matrix, while later specialist renderers remain explicit. |
| 2 | Pick the capability layer | Standard packages receive `preset-lite`, `preset-office`, `preset-engineering`, or `preset-all` through options; Full packages enable the published compatibility matrix, while later specialist renderers remain explicit additions. |
| 3 | Publish runtime assets | Full packages use `copyAssets:true` with Vite; other build tools run `npx --no-install file-viewer-copy-assets ./public/file-viewer` so every selected capability has its matching Worker/WASM assets. |
| 4 | Pass the source and options | Use `url="/files/demo.pdf"` or a real `File`; standard packages pass a preset through `options`, while full packages can start with theme, toolbar, watermark, and business options only. |
| 5 | Confirm style isolation | Every standard component defaults to Shadow DOM. Customize with tokens / `::part()` and use `options.styleIsolation:'none'` only for legacy deep overrides. |

This page keeps the shortest runnable paths. See [Component Options](/guide/usage) for the full API, renderer package matrix, toolbar, watermark, print, search, lifecycle, and guard options. See [Style Isolation And Customization](/guide/style-isolation) for Shadow DOM, tokens, and parts. See [Modular Assembly](/guide/on-demand-renderers) for on-demand renderers and the Vite plugin.

<div class="doc-callout">
  <strong>Mobile note:</strong> for H5 and mobile browsers, give the viewer host a stable height such as <code>height:100dvh; min-height:0</code>, and prefer <code>toolbar.position:'bottom-right'</code>. React Native should load a WebView-based H5 viewer route; the DOM component cannot mount directly into native RN views. See the <a href="/guide/quickstart-react#mobile-h5-and-react-native-webview">React mobile example</a>.
</div>

## Pick The Capability Layer First

Installing a standard component package such as `@file-viewer/vue3`, `@file-viewer/react`, or `@file-viewer/web` is the lightest path. It gives you the native framework component, types, controller APIs, and the core foundation; it does not install every heavy PDF, Office, CAD, Typst, archive, or engineering renderer by default.

If you want to validate the complete official demo capability first, use a full package. Full packages already include `@file-viewer/preset-all`; do not install or pass another preset. Complete npm support also includes matching Worker, WASM, font, and vendor assets: Vite publishes them automatically, while other build tools run the same-version CLI included by every full package. For CDN / script-tag pages, prefer `@file-viewer/web-full`: direct jsDelivr/unpkg usage, or an intact mirror of the complete `dist/` directory, resolves every asset relative to the script URL and needs no copy command.

| Mode | Install | Notes |
| --- | --- | --- |
| Light standard package | `npm i @file-viewer/vue3 @file-viewer/preset-office` | Pick exactly the preset / renderer your product needs |
| Complete full package | `npm i @file-viewer/vue3-full` | Includes `preset-all`; publish runtime assets under `<deployment-base>/file-viewer/` for complete support |
| CDN full | `https://unpkg.com/@file-viewer/web-full@latest/dist/flyfish-file-viewer-web-full.iife.js` | No local install, ideal for script-tag validation |

Add a preset or a single renderer package for the file formats your product actually needs:

| Package | Coverage | Best fit |
| --- | --- | --- |
| `@file-viewer/preset-lite` | Text, Markdown, code, image, audio, video | Lightweight attachment preview |
| `@file-viewer/preset-office` | PDF, Word, Excel, PowerPoint, OFD, RTF, OpenDocument | OA, approvals, knowledge bases, contracts |
| `@file-viewer/preset-engineering` | CAD, 3D, drawing, XMind, Geo, Typst, Archive, Data, EDA | Engineering, R&D, design assets |
| `@file-viewer/preset-all` | Full official demo matrix | Demos and internal all-format workbenches |
| Single renderer | For example `@file-viewer/renderer-pdf` or `@file-viewer/renderer-word` | Minimal custom format cuts |

The most stable integration path is to import a preset or renderer explicitly and pass it through `options.preset` / `options.renderers`. This works in Webpack, Rspack, Rollup, Umi, classic multi-page apps, micro-frontends, and internal component libraries. Vite projects can add `@file-viewer/vite-plugin` later to remove manual imports and copy offline assets automatically.

### Universal Setup: Inject options.preset

Install the component package and one preset:

```bash
pnpm add @file-viewer/vue3 @file-viewer/preset-office
```

```ts
import officePreset from '@file-viewer/preset-office'

export const viewerOptions = {
  preset: officePreset,
  rendererMode: 'replace',
  theme: 'light',
  toolbar: { position: 'bottom-right' }
}
```

Pass the same options object to your framework component:

```vue
<file-viewer url="/files/demo.docx" :options="viewerOptions" />
```

Multiple capability bundles use the same `preset` field as an array, so applications do not need a second option name:

```ts
import officePreset from '@file-viewer/preset-office'
import engineeringPreset from '@file-viewer/preset-engineering'

export const viewerOptions = {
  preset: [officePreset, engineeringPreset],
  rendererMode: 'replace'
}
```

For the smallest exact cut, skip presets and install a single renderer:

```bash
pnpm add @file-viewer/vue3 @file-viewer/renderer-pdf
```

```ts
import { pdfRenderer } from '@file-viewer/renderer-pdf'

export const viewerOptions = {
  renderers: [pdfRenderer],
  rendererMode: 'replace'
}
```

If a file extension is supported but the required renderer is not assembled, the viewer shows an install-oriented hint instead of a vague unsupported state.

### Complete Setup: Full Packages

Full packages are for teams that want the complete format experience first and can optimize package size later. They expose the same props, events, controller APIs, and options as standard packages, with `preset-all` built in and enabled by default. Do not install another preset:

| Ecosystem | Full package | Standard package |
| --- | --- | --- |
| Vanilla JS / Web Component | `@file-viewer/web-full` | `@file-viewer/web` |
| Vue 3 | `@file-viewer/vue3-full` | `@file-viewer/vue3` |
| Vue 2.7 | `@file-viewer/vue2.7-full` | `@file-viewer/vue2.7` |
| Vue 2.6 | `@file-viewer/vue2.6-full` | `@file-viewer/vue2.6` |
| React 18 / 19 | `@file-viewer/react-full` | `@file-viewer/react` |
| React 16.8 / 17 | `@file-viewer/react-legacy-full` | `@file-viewer/react-legacy` |
| jQuery | `@file-viewer/jquery-full` | `@file-viewer/jquery` |
| Svelte | `@file-viewer/svelte-full` | `@file-viewer/svelte` |

```bash
npm install @file-viewer/vue3-full
```

```vue
<script setup lang="ts">
import { FileViewer } from '@file-viewer/vue3-full'
</script>

<template>
  <FileViewer url="/files/contract.pdf" :options="{ theme: 'light' }" />
</template>
```

Each framework keeps its native integration API; do not copy the Vue component syntax across stacks:

```ts
// Vue 2.7; use @file-viewer/vue2.6-full with Vue 2.6.
import Vue from 'vue'
import FileViewerPlugin from '@file-viewer/vue2.7-full'
Vue.use(FileViewerPlugin)
```

```tsx
import FileViewer from '@file-viewer/react-full'
export const Preview = () => <FileViewer url="/files/contract.pdf" />
```

```svelte
<script>
  import FileViewer from '@file-viewer/svelte-full'
</script>
<FileViewer url="/files/contract.pdf" />
```

```ts
import $ from 'jquery'
import installFileViewer from '@file-viewer/jquery-full'
installFileViewer($)
$('#viewer').fileViewer({ url: '/files/contract.pdf' })
```

Every full package defaults its runtime asset base to `file-viewer/` under the deployment base (`/file-viewer/` at the origin root) and pre-fills Archive, PDF, DOCX, Excel, PPTX, CAD, Typst, Draw.io, and SQLite asset URLs. Vite projects register the plugin once to publish complete assets in development and production:

```ts
import { fileViewerRenderers } from '@file-viewer/vite-plugin'

export default {
  plugins: [fileViewerRenderers({ copyAssets: true })]
}
```

Webpack, Rspack, Rollup, Vue CLI, Umi, and classic multi-page projects run the same-version CLI included by the full package:

```bash
npx --no-install file-viewer-copy-assets ./public/file-viewer
```

The complete `web-full` `dist/` already carries assets and can be deployed without this command; entry-only builds run the included CLI.

Without `file-viewer/` under the deployment base, lightweight formats and a few compatibility paths may still work, but CAD, Typst, RAR/7z/encrypted archives, Draw.io, SQLite, PDF CMaps/fonts, and similar pipelines are not complete.

If your static prefix is different, set the default base once during application startup:

```ts
import { setDefaultFullAssetBaseUrl } from '@file-viewer/vue3-full'

setDefaultFullAssetBaseUrl('/static/file-viewer/')
```

Explicit options such as `options.archive.workerUrl` or `options.pdf.workerUrl` still win, which keeps tenant-specific or staged static paths easy to override.

### CDN Full: Complete Script-Tag Trial

No-build pages can load the full CDN bundle directly. Direct jsDelivr/unpkg usage, or an intact deployment of the complete `dist/` directory under one static prefix, needs no asset copy command. Copying only the entry IIFE is not a complete deployment.

```html
<div id="viewer" style="height:720px"></div>

<script src="https://unpkg.com/@file-viewer/web-full@latest/dist/flyfish-file-viewer-web-full.iife.js"></script>
<script>
  FlyfishFileViewerWebFull.mountViewer(document.getElementById('viewer'), {
    url: '/files/demo.pdf',
    options: {
      theme: 'light',
      toolbar: { position: 'bottom-right' }
    }
  })
</script>
```

The Custom Element route is available as well:

```html
<script src="https://unpkg.com/@file-viewer/web-full@latest/dist/flyfish-file-viewer-web-full.iife.js"></script>
<flyfish-file-viewer
  src="/files/demo.docx"
  theme="light"
  toolbar-position="bottom-right"
  style="display:block;height:720px"
></flyfish-file-viewer>
```

### Vite Plugin: Zero-Config Assembly

In Vite projects, standard component packages install one `@file-viewer/preset-*`; full packages already include `preset-all`. Once `fileViewerRenderers({ copyAssets:true })` is registered, it recognizes the installed full package or preset. Full assets publish under `<deployment-base>/file-viewer/`; standard packages/presets keep their existing root placement. Application code does not import another preset:

```bash
pnpm add @file-viewer/vue3 @file-viewer/preset-office
pnpm add -D @file-viewer/vite-plugin
```

```ts
// vite.config.ts
import { fileViewerRenderers } from '@file-viewer/vite-plugin'

export default {
  plugins: [
    fileViewerRenderers({
      copyAssets: true
      // No preset:'office' needed; the plugin discovers installed @file-viewer/preset-office.
    })
  ]
}
```

For complete capability, switch to a full package and remove the separate preset:

```bash
pnpm add @file-viewer/vue3-full
pnpm add -D @file-viewer/vite-plugin
```

Use explicit options only when you need customization:

| Option | Best fit |
| --- | --- |
| `copyAssets:true` | Recognizes full packages / presets; full packages publish under `<deployment-base>/file-viewer/` in dev and production, while standard packages/presets keep root placement; required for full packages |
| `formats` / `renderers` | Generates exact renderer imports when you do not use a preset, or when a preset needs a few extra formats |
| `scan:true` | Scans source hints such as `fileViewerFormats`, `data-file-viewer-formats`, and upload `accept` attributes |
| `preset:'auto'` / `autoPresets:true` | Keeps installed preset auto-discovery active while `scan:true` is enabled |
| `inject:false` | Disables auto injection so you can import `virtual:file-viewer-renderers` and pass `options.renderers` manually |
| `chunkStrategy:'renderer'` | Splits chunks by renderer for caching, debugging, and heavy-pipeline size analysis |

The recommended default is `fileViewerRenderers({ copyAssets:true })`. Configure the advanced options only for strict bundle cuts, source-hint scanning, or complete registry control.

## Vanilla JavaScript / Web Component

```bash
npm install @file-viewer/web @file-viewer/preset-office
```

```html
<flyfish-file-viewer
  id="viewer"
  src="/files/demo.pdf"
  filename="demo.pdf"
  locale="en-US"
  theme="light"
  toolbar-position="bottom-right"
  style="display:block;height:720px"
></flyfish-file-viewer>
```

```ts
import { defineFileViewerElement } from '@file-viewer/web'
import officePreset from '@file-viewer/preset-office'

defineFileViewerElement()

const viewer = document.getElementById('viewer')
viewer.options = {
  preset: officePreset,
  rendererMode: 'replace',
  theme: 'light',
  toolbar: { position: 'bottom-right' }
}
```

## Vue 3

```bash
npm install @file-viewer/vue3 @file-viewer/preset-office
```

```ts
import { createApp } from 'vue'
import App from './App.vue'
import FileViewer from '@file-viewer/vue3'

createApp(App).use(FileViewer).mount('#app')
```

```vue
<script setup lang="ts">
import officePreset from '@file-viewer/preset-office'

const viewerOptions = {
  preset: officePreset,
  rendererMode: 'replace',
  theme: 'light',
  toolbar: { position: 'bottom-right' }
}
</script>

<template>
  <div style="height: 100vh">
    <file-viewer url="/files/report.docx" :options="viewerOptions" />
  </div>
</template>
```

## React

```bash
npm install @file-viewer/react @file-viewer/preset-office
```

```tsx
import FileViewer from '@file-viewer/react'
import officePreset from '@file-viewer/preset-office'

export function Preview() {
  return (
    <div style={{ height: '100vh' }}>
      <FileViewer
        url="/files/report.pdf"
        options={{
          preset: officePreset,
          rendererMode: 'replace',
          theme: 'light',
          toolbar: { position: 'bottom-right' },
          archive: { cache: true }
        }}
      />
    </div>
  )
}
```

React 16.8/17 projects can use `@file-viewer/react-legacy`.

## Locale And Copy

The viewer defaults to `locale: 'auto'`, which follows the browser language and resolves to Chinese or English. Use the same `options` object across Vanilla JS / Pure Web, Vue, React, jQuery, and Svelte when you need a fixed locale or custom copy:

```ts
const options = {
  locale: 'en-US',
  messages: {
    'toolbar.download': 'Save file'
  }
}
```

You can also group locale and copy under `i18n`:

```ts
const options = {
  i18n: {
    locale: 'zh-CN',
    messages(key, params, locale) {
      return key === 'state.empty.title' ? '请选择文件' : undefined
    }
  }
}
```

Web Component users can set `locale="en-US"` directly on `<flyfish-file-viewer>`.

You can read the complete `FileViewerMessageKey` mapping from core. The exported object is the same copy source used at runtime, so it is the safest way to generate translation sheets, coverage checks, or custom-copy tests for the installed version:

```ts
import {
  FILE_VIEWER_BUILTIN_MESSAGES,
  type FileViewerMessageKey
} from '@file-viewer/core'

const rows: Array<{
  key: FileViewerMessageKey
  zhCN: string
  enUS: string
}> = Object.keys(FILE_VIEWER_BUILTIN_MESSAGES['zh-CN']).map(key => ({
  key: key as FileViewerMessageKey,
  zhCN: FILE_VIEWER_BUILTIN_MESSAGES['zh-CN'][key as FileViewerMessageKey],
  enUS: FILE_VIEWER_BUILTIN_MESSAGES['en-US'][key as FileViewerMessageKey]
}))
```

`messages` only needs the keys you want to override. Missing keys continue to use the built-in copy for the active `locale`. Loading states, error states, toolbar controls, PDF / Office / OFD / archive surfaces, and standard renderer notices all follow the same `options.locale` / `options.i18n` path.

## Authenticated Files

If your app must authenticate before downloading a file, fetch the file in the host app and pass a named `File` to the viewer:

```ts
const blob = await fetch('/api/files/contract', {
  credentials: 'include'
}).then(response => response.blob())

const file = new File([blob], 'contract.pdf', { type: blob.type })
```

Passing a filename with an extension is important because the viewer uses it to pick the renderer.

## Full-Package Worker And WASM Assets

The renderer matrix alone is not the complete full-package contract. Non-Vite full packages run their included same-version CLI and serve the output from `file-viewer/` under the deployment base:

```bash
npx --no-install file-viewer-copy-assets ./public/file-viewer
```

`web-full` may instead deploy its complete `dist/`, which already contains the assets.

The command verifies PDF, archive, DOCX, spreadsheet, Draw.io, CAD, Typst, SQLite, Worker, WASM, font, and vendor assets and writes `flyfish-viewer-assets.json`. Use `setDefaultFullAssetBaseUrl()` only when the public URL differs. Direct CDN `web-full`, or an intact mirror of its complete `dist/`, is the no-copy exception.

## Zero-Dependency Integration: Official Demo iframe

If a customer system only needs preview capability and should not install npm packages or change its build pipeline, use the official demo build output directly. Download `file-viewer-v2-*-official-demo-iframe.tar.gz` from GitHub Releases, extract it to one static directory such as `/file-viewer/`, and keep `assets/`, `vendor/`, `wasm/`, and `example/` together.

The simplest URL-based preview:

```html
<iframe
  src="/file-viewer/iframe.html?url=/files/demo.docx"
  style="width:100%;height:720px;border:0"
  allow="fullscreen"
></iframe>
```

If the parent page must fetch an authenticated file first, pass the resulting `Blob` to the demo:

```html
<input id="file" type="file">
<iframe id="viewer" style="width:100%;height:720px;border:0"></iframe>

<script>
  const viewer = document.querySelector('#viewer')

  function openFile(file) {
    const src = new URL('/file-viewer/iframe.html', location.origin)
    src.searchParams.set('from', location.origin)
    src.searchParams.set('name', file.name)
    viewer.src = src
    viewer.addEventListener('load', () => {
      viewer.contentWindow.postMessage(file, src.origin)
    }, { once: true })
  }

  document.querySelector('#file').addEventListener('change', event => {
    const file = event.target.files && event.target.files[0]
    if (file) openFile(file)
  })
</script>
```

`from` must equal the parent page origin. The demo accepts only a `Blob` from that origin. Prefer `/iframe.html` for the chrome-free entry, or `/iframe` on static hosts that support clean URLs. The original `/index.html` demo entry keeps the same `url`, `from`, `name`, and `postMessage(Blob)` protocol for existing customer integrations.

## Try The Demo Locally

```bash
pnpm install
pnpm dev
```

The main demo opens at the Vite dev server URL. The zero-dependency iframe entry is available at `/iframe.html`, and the comparison demo is available at `/compare.html`.

### Japanese locale

Use `locale: 'ja-JP'` to force Japanese. The default `auto` mode checks the complete `navigator.languages` preference list and selects Japanese for `ja`, `ja-JP`, and other Japanese language tags. Unsupported browser locales fall back to English.

### German locale

Use `locale: 'de-DE'` to force German. The default `auto` mode checks the complete `navigator.languages` preference list and selects German for `de`, `de-DE`, and other German language tags. Unsupported browser locales fall back to English.
