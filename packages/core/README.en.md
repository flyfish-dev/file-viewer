# @file-viewer/core

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/core/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/core/README.zh-CN.md)

Framework-neutral TypeScript APIs for browser-side file preview. Build a viewer in Vanilla JavaScript, or use the Vue, React, Svelte and jQuery components with the same loading, search, zoom, page navigation, print and export controls. Files are processed locally, without server-side conversion.

<!-- FILE_VIEWER_PACKAGE_HEADER -->
<p>
  <a href="https://www.npmjs.com/package/@file-viewer/core"><img src="https://img.shields.io/npm/v/@file-viewer%2Fcore?logo=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@file-viewer/core"><img src="https://img.shields.io/npm/dm/@file-viewer%2Fcore?logo=npm" alt="npm downloads"></a>
  <a href="https://github.com/flyfish-dev/file-viewer/stargazers"><img src="https://img.shields.io/github/stars/flyfish-dev/file-viewer?style=flat&logo=github" alt="GitHub stars"></a>
  <a href="https://github.com/flyfish-dev/file-viewer/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License: Apache-2.0"></a>
</p>

<p>
  <a href="https://github.com/flyfish-dev/file-viewer">GitHub</a> · <a href="https://doc.file-viewer.app/">Docs</a> · <a href="https://demo.file-viewer.app/">Live demo</a> · <a href="https://doc.file-viewer.app/guide/formats">Format matrix</a> · <a href="https://github.com/flyfish-dev/file-viewer/issues">Issues</a> · <a href="https://github.com/flyfish-dev/file-viewer/blob/main/packages/core/README.zh-CN.md">简体中文</a>
</p>

<p>
  <a href="https://demo.file-viewer.app/"><img src="https://raw.githubusercontent.com/flyfish-dev/file-viewer/main/docs/public/_media/file-viewer-demo-v3-en.webp" width="760" alt="File Viewer live demo: Word, Excel, PowerPoint, 3D model, CAD drawing and binary inspector"></a>
</p>

> ⭐ If File Viewer helps you, please [star the repo on GitHub](https://github.com/flyfish-dev/file-viewer).

File Viewer has a catalog of 275 file extensions through optional renderers. **This package is the lightweight foundation, not an all-format viewer.** Add only the engines your application needs; stable and experimental support are listed separately in the [format matrix](https://doc.file-viewer.app/guide/formats).

## Start here

- [Create a configured application](https://doc.file-viewer.app/guide/cli): `npm create file-viewer@latest my-viewer`.
- [Use a Web Component](https://doc.file-viewer.app/guide/quickstart-web), or choose a [framework integration](https://github.com/flyfish-dev/file-viewer#readme).
- For a custom integration, use `core/headless` for metadata and contracts, or `core/browser` for DOM rendering. PDF and Office require an explicit renderer or preset and local runtime assets.

```bash
npm install @file-viewer/core
```

## Browser source feedback (unreleased)

The browser `mountViewer` shell shows localized download feedback while buffering a URL, then reading feedback until the renderer takes over. File and buffer inputs use reading feedback. The status follows the configured locale/theme, reports acquisition failures, and is cleared when a source is replaced or the viewer is destroyed.

## Preflight Before Rendering

`precheckFileViewerSource()` does not create a viewer or load a heavy renderer. It checks whether the extension is available and validates known PDF, OpenXML / OpenDocument, legacy OLE Office, and RTF signatures or package parts. `valid: null` explicitly means capability-only detection, not a full parse; the real renderer remains the final authority for malformed content.

```ts
import { precheckFileViewerSource } from '@file-viewer/core/headless'

const result = await precheckFileViewerSource(file, {
  // Restrict this to the extensions actually installed by this product.
  supportedExtensions: ['pdf', 'docx', 'xlsx', 'pptx']
})

if (!result.previewable) {
  console.warn(result.reason, result.missingParts)
}
```

## Entry points

Use `@file-viewer/core/headless` when a component package, server-side helper, or build script only needs framework-neutral contracts: format support, source normalization, renderer capability metadata, lifecycle/operation context, option normalization, state helpers, and static asset resolution. This entry intentionally does not expose the DOM viewer engine or browser renderers.

```ts
import {
  DEFAULT_SUPPORTED_EXTENSIONS,
  normalizeSource,
  resolveFileViewerRendererAssets
} from '@file-viewer/core/headless'

const source = normalizeSource({ url: '/files/report.pdf' })
const pdfAssets = resolveFileViewerRendererAssets('pdf', {
  baseUrl: '/file-viewer/'
})
```

Use `@file-viewer/core/browser` when a native component package or pure browser integration needs the shared browser shell and toolbar, direct DOM engine, renderer registry, search/zoom providers, print/export adapters, and framework-neutral Canvas/Worker/WASM renderers.

```ts
import { createViewer } from '@file-viewer/core/browser'

const viewer = createViewer(document.querySelector('#viewer')!, {
  options: {
    toolbar: true,
    styleIsolation: 'shadow'
  }
})

// Images use the built-in renderer; document formats need an optional preset.
await viewer.load({ url: '/files/photo.png' })
```

Zoom buttons keep their positions and become disabled at their limits. Configure the existing `toolbar.items` map to hide reset controls while retaining the `resetZoom()` API. Set `pdf.zoomToolbar` to `false` to hide the PDF renderer's zoom group while keeping its page navigation and rotation controls:

```ts
const options = {
  toolbar: { items: { 'zoom-reset': false } },
  pdf: { zoomToolbar: false }
}
```

HTML document builders live in the opt-in export entry so ordinary previews do
not download the sanitizer. The viewer's `exportHtml()` and `print()` methods
load this entry only when invoked. For v3, migrate direct builder imports from
the package root to the explicit subpath:

```ts
import {
  buildExportHtmlDocument,
  buildFileViewerRenderedHtmlDocument
} from '@file-viewer/core/export'
```

The deprecated Vue 3 template re-exports are asynchronous in v3 to preserve
this lazy boundary, so legacy calls must use `await buildExportHtmlDocument(...)`
or `await collectDocumentStyles()`. Direct imports from the `export` subpath
keep their documented return types.

`options.styleIsolation` accepts `auto`, `shadow`, `scoped`, or `none`. Use `shadow` when a custom host or framework wrapper needs a ShadowRoot-backed render surface. Core passes the resolved `surface` to renderer `load(context)`, so custom renderers should inject styles into `context.surface.shadowRoot` or the renderer container instead of `document.head`, and should mount overlays inside the same isolated surface when possible.

The root `@file-viewer/core` entry remains the normal browser-compatible entry. New component packages should prefer the narrowest explicit entry point they need: `headless` for contracts and build-time helpers, `browser` for real browser preview, and `export` for sanitized standalone HTML documents.

```ts
import {
  listFileViewerRendererAssetManifests,
  resolveFileViewerRendererAssets
} from '@file-viewer/core'

const manifests = listFileViewerRendererAssetManifests()
const archiveAssets = resolveFileViewerRendererAssets('archive', {
  baseUrl: '/file-viewer/'
})
```

For non-Vite hosts or custom static directories, configure one runtime asset
base before loading a file. Renderer-specific URLs still take priority. The
Vite plugin sets this automatically from `copyAssets.baseDir`.

```ts
import { setDefaultFileViewerAssetBaseUrl } from '@file-viewer/core'

setDefaultFileViewerAssetBaseUrl('/tenant/static/file-viewer/')
```

The manifest API lets wrappers and deployment scripts discover archive, DOCX, Spreadsheet, CAD, Typst, and data-asset worker/WASM resources from the same core contract instead of hard-coding per-framework paths. Spreadsheet assets remain part of the shared deployment contract for `@file-viewer/renderer-spreadsheet`; CAD assets remain part of the shared deployment contract for `@file-viewer/renderer-cad`; archive assets remain part of the shared deployment contract for `@file-viewer/renderer-archive`; DOCX assets remain part of the shared deployment contract for `@file-viewer/renderer-word`; SQLite WASM asset resolution remains in core so `@file-viewer/renderer-data` and deployment tools share one stable offline path.

Official documentation: https://doc.file-viewer.app/

Online demo: https://demo.file-viewer.app/

Public source repositories:

- GitHub: https://github.com/flyfish-dev/file-viewer-core
- Gitee: https://gitee.com/flyfish-dev/file-viewer-core

License: Apache-2.0. For second development or commercial use, keep clear Flyfish Viewer attribution and contribute shared compatibility improvements where possible.

## Formats and related packages

File Viewer previews 275+ file extensions in the browser, covering Office, PDF/OFD, CAD, 3D, archives, email, images, media and code, without server-side conversion. See the [format matrix](https://doc.file-viewer.app/guide/formats) for the full list.

- Components: `@file-viewer/web`, `@file-viewer/vue3`, `@file-viewer/vue2.7`, `@file-viewer/vue2.6`, `@file-viewer/react`, `@file-viewer/react-legacy`, `@file-viewer/svelte`, `@file-viewer/jquery`, plus their `-full` packages
- Presets: `@file-viewer/preset-lite`, `@file-viewer/preset-office`, `@file-viewer/preset-engineering`, `@file-viewer/preset-all`
- Build: `@file-viewer/vite-plugin`, `file-viewer-copy-assets`

## License

This package is Apache-2.0. See [LICENSE](https://github.com/flyfish-dev/file-viewer/blob/main/LICENSE).
