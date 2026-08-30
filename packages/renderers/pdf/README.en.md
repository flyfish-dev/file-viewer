# @file-viewer/renderer-pdf

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

When no explicit PDF asset URL is configured, the renderer first uses the public base exposed by build tools such as Vite and can fall back to the page entry script. An app deployed under `/workspace/` therefore still requests `/workspace/vendor/pdf/pdf.worker.mjs` while its current SPA route is `/workspace/c/`. UMI, custom proxies, and builds whose public path cannot be detected can set `pdf.assetBaseUrl: '/workspace/'` to pin the base for every PDF offline asset. Before creating a static Worker, the renderer reads the official PDF.js version marker; a stale Worker from an older deployment is rejected and the packaged same-version handler is used instead. If the host app did not run `file-viewer-copy-assets`, does not use `@file-viewer/vite-plugin`, or a local dev server falls back to HTML for that path, the same fallback prevents `Setting up fake worker failed`. For best performance, complete cMap/standard-font/WASM decoding, or strict offline deployments, still copy viewer assets and point these URLs at real static files. The pinned PDF.js 5.4 stable line loads local JBIG2, JPEG 2000, color-management, and related helpers through `wasmUrl`; viewer assets and the Vite plugin copy them without relying on the public internet.

`cjkFontFallback` is enabled by default. When a PDF references `MicrosoftYaHei-Bold`, SimSun, SimHei, or another CJK font without embedding the font program, the renderer prefers an installed system font and otherwise aliases the original PDF font name to the local Noto Sans SC variable font supplied by `@file-viewer/assets-standard`. The Vite plugin reuses that standard asset set instead of packing a second font copy into the renderer. Only WOFF2 shards needed by the current page text are loaded. The first page waits for the font before rendering, and later pages are redrawn when they introduce new glyphs. Set the option to `false` to disable this behavior, or point `cjkFontFallbackPath` at a self-hosted directory with the same structure.

`identityFontRepair` is also enabled by default for malformed PDFs that write TrueType glyph IDs through `Identity-H`/`Identity-V` but omit `ToUnicode`. The repair module is loaded only after CJK font substitution and multiple control-character glyphs are detected. If the same PDF embeds a usable same-family TrueType font, its cmap is used to rebuild the Unicode mapping for the in-memory preview. The repair is applied only to a preview copy and never overwrites the original file or download source; an unsafe or unsupported repair falls back to the original preview. Set the option to `false` to disable this compatibility path.

## Migration Note

PDF rendering has moved out of `@file-viewer/core` into this package, and `pdfjs-dist` is now declared only by `@file-viewer/renderer-pdf`. Installing core or a standard component package no longer pulls PDF.js; explicitly assemble this renderer when PDF preview is needed, or use `@file-viewer/preset-all`.

The published renderer stages its Apache-2.0 PDF.js runtime under `dist/vendor/pdfjs` and isolates PDF.js' internal webpack bootstrap before packing. `provenance.json` records each upstream source hash, transform count, and staged output hash, so webpack 4 consumers do not need a loader for renderer-internal paths.
