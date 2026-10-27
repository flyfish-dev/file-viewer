# @file-viewer/renderer-pdf

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/pdf/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/pdf/README.zh-CN.md)

Cold-network loading starts the real Worker directly, without a duplicate version-probe request.
PDF.js checks API compatibility before parsing. Mismatched workers are destroyed and retried
with the bundled matching handler without losing transferred input. Main-thread fallbacks
use asynchronous resource fetching instead of synchronous binary XHR.

Standalone PDF renderer package for Flyfish File Viewer. It is powered by PDF.js and provides page rendering, navigation, outline, search, zoom, print, and HTML export support.

## Usage

```ts
import FileViewer from '@file-viewer/vue3'
import { pdfRenderer } from '@file-viewer/renderer-pdf'

const options = {
  rendererMode: 'replace',
  renderers: pdfRenderer,
}
```

You can combine it with other renderer packages:

```ts
const options = {
  rendererMode: 'replace',
  renderers: [pdfRenderer],
}
```

## PDF URL loading

The standard PDF renderer accepts URL sources across Vanilla/Web Component, React, Svelte, jQuery and Vue. `pdf.streaming` defaults to `'same-origin'`; use `true` for a CORS-enabled cross-origin or signed URL and supply `filename: 'document.pdf'` or `type: 'pdf'` when the URL has no extension. The renderer gives that URL directly to PDF.js without a complete core prefetch. Range requests require server support and, across origins, exposed `Accept-Ranges`, `Content-Length` and `Content-Range` response headers.

`pdf.streaming: false` downloads the file once before rendering. Explicit buffers/files and a caller-supplied `fetchFile` hook keep their byte-acquisition precedence; an original URL remains metadata and does not trigger another PDF.js download. Custom buffer-only renderers also keep their declared contract. PDF.js streaming may continue fetching in the background. To load only demanded ranges, set both `pdf.disableStream: true` and `pdf.disableAutoFetch: true`; disabling auto-fetch requires disabling streaming, and both options retain PDF.js defaults when omitted.

## Reading theme

Live updates without reloading apply to the renderer's observed theme attributes, system color scheme and the Vanilla core theme update path. Framework component and toolbar/controller option updates may reinitialize the preview.

PDF pages follow `options.theme` (`light`, `dark`, or `system`), including live theme changes. Dark reading uses a preview-only canvas color filter; it also changes image colors. Set `pdf.darkMode: false` to keep the document's original colors, or `true` to force dark reading independently of the toolbar. Original downloads, printed pages, and exported canvas bytes retain their source colors.

## Offline Assets

PDF preview depends on the PDF.js worker, cMaps, WASM helpers, standard fonts, and an offline fallback for unembedded CJK fonts. Asset paths use the same unified options as `@file-viewer/core`:

```ts
const options = {
  renderers: pdfRenderer,
  pdf: {
    assetBaseUrl: '/workspace/',
    workerUrl: '/vendor/pdf/pdf.worker.mjs',
    cMapUrl: '/vendor/pdf/cmaps/',
    wasmUrl: '/vendor/pdf/wasm/',
    standardFontDataUrl: '/vendor/pdf/standard_fonts/',
    cjkFontFallbackPath: '/vendor/pdf/fonts/',
    identityFontRepair: true,
  },
}
```

When no explicit PDF asset URL is configured, the renderer first uses the public base exposed by build tools such as Vite and can fall back to the page entry script. An app deployed under `/workspace/` therefore still requests `/workspace/vendor/pdf/pdf.worker.mjs` while its current SPA route is `/workspace/c/`. UMI, custom proxies, and builds whose public path cannot be detected can set `pdf.assetBaseUrl: '/workspace/'` to pin the base for every PDF offline asset. The real Worker checks API compatibility before parsing. An incompatible Worker is destroyed and retried with the packaged matching handler, without a separate version-probe request. If the host app did not run `file-viewer-copy-assets`, does not use `@file-viewer/vite-plugin`, or a local dev server falls back to HTML for that path, the same fallback prevents `Setting up fake worker failed`. For best performance, complete cMap/standard-font/WASM decoding, or strict offline deployments, still copy viewer assets and point these URLs at real static files. The pinned PDF.js 5.4 stable line loads local JBIG2, JPEG 2000, color-management, and related helpers through `wasmUrl`; viewer assets and the Vite plugin copy them without relying on the public internet.

`cjkFontFallback` is enabled by default. When a PDF references `MicrosoftYaHei-Bold`, SimSun, SimHei, or another CJK font without embedding the font program, the renderer prefers an installed system font and otherwise aliases the original PDF font name to the local Noto Sans SC variable font supplied by `@file-viewer/assets-standard`. The Vite plugin reuses that standard asset set instead of packing a second font copy into the renderer. Only WOFF2 shards needed by the current page text are loaded. The first page waits for the font before rendering, and later pages are redrawn when they introduce new glyphs. Set the option to `false` to disable this behavior, or point `cjkFontFallbackPath` at a self-hosted directory with the same structure.

`identityFontRepair` is also enabled by default for malformed PDFs that write TrueType glyph IDs through `Identity-H`/`Identity-V` but omit `ToUnicode`. The repair module is loaded only after CJK font substitution and multiple control-character glyphs are detected. If the same PDF embeds a usable same-family TrueType font, its cmap is used to rebuild the Unicode mapping for the in-memory preview. The repair is applied only to a preview copy and never overwrites the original file or download source; an unsafe or unsupported repair falls back to the original preview. Set the option to `false` to disable this compatibility path.

## Migration Note

PDF rendering has moved out of `@file-viewer/core` into this package, and `pdfjs-dist` is now declared only by `@file-viewer/renderer-pdf`. Installing core or a standard component package no longer pulls PDF.js; explicitly assemble this renderer when PDF preview is needed, or use `@file-viewer/preset-all`.

The published renderer stages its Apache-2.0 PDF.js runtime under `dist/vendor/pdfjs` and isolates PDF.js' internal webpack bootstrap before packing. `provenance.json` records source hashes after the declared patches, transform counts, and staged output hashes, so webpack 4 consumers do not need a loader for renderer-internal paths.

The staged runtime also includes a PDF.js 5.4.624 document-startup cancellation patch. It prevents unhandled promise rejections when switching files during main-thread fallback initialization; active parsing and password errors remain visible. The patch is included under `dist/vendor/pdfjs/patches/` with its hash in `provenance.json`. `pnpm verify:worker-lifecycle` tests cancellation, subsequent rendering, and invalid-file errors in both real and main-thread Workers on Chromium and WebKit.

## Mouse panning

`options.pdf.handTool: true` enables mouse drag-to-pan in the PDF viewport. It is
`false` by default, preserving text selection. Touch scrolling/pinch, links, form
fields, scrollbars, and modified clicks retain their native behavior.

```ts
const options = { pdf: { handTool: true } }
```

## Page orientation and print output

A page's stored PDF rotation is combined with the viewer's rotation offset in
fit calculations, sidebar/first-page thumbnails, exported images, and printing.
The view-state `rotation` field remains the viewer offset, not the stored page
rotation. Mixed page sizes and orientations use individual CSS page rules for
printing; no source PDF bytes are modified. Printer-dialog overrides may still
force a uniform paper size.
