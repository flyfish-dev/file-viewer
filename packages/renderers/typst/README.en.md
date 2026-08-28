# @file-viewer/renderer-typst

Standalone Typst renderer package for Flyfish File Viewer. It reads `.typ` / `.typst` source files directly and uses the browser WASM compiler / renderer from `@myriaddreamin/typst.ts` to produce paged SVG output, so source-code fallback is never treated as a successful preview.

## Usage

```ts
import FileViewer from '@file-viewer/vue3'
import { typstRenderer } from '@file-viewer/renderer-typst'

const options = {
  rendererMode: 'replace',
  renderers: typstRenderer,
}
```

You can also compose it with other renderer packages:

```ts
import { pdfRenderer } from '@file-viewer/renderer-pdf'
import { typstRenderer } from '@file-viewer/renderer-typst'

const options = {
  rendererMode: 'replace',
  renderers: [pdfRenderer, typstRenderer],
}
```

## Capabilities

- Supports `.typ` and `.typst`.
- Compiles Typst source in the browser and renders SVG pages.
- Preserves page size metadata for preview, zoom, print, and HTML export.
- Supports `options.typst.renderTimeoutMs` for slow asset loading and long-running documents.
- Reports clear diagnostics for missing WASM assets, wrong MIME types, network failures, and Typst compile errors.

## Offline Assets

The default asset paths are:

- `wasm/typst/typst_ts_web_compiler_bg.wasm`
- `wasm/typst/typst_ts_renderer_bg.wasm`
- `wasm/typst/fonts/`

For private deployments, override them with `options.typst.compilerWasmUrl`, `options.typst.rendererWasmUrl`, and `options.typst.fontAssetsUrl`. The default text fonts ship with this package and are copied by `file-viewer-copy-assets` / `@file-viewer/vite-plugin`, so the runtime does not depend on public CDNs.

## CSP and Trusted Types

Typst SVG is rendered through controlled XML parsing, structural sanitization, and DOM node import without `innerHTML`. If the site enables `require-trusted-types-for 'script'`, allow `file-viewer-typst-svg` in the `trusted-types` directive (the DOMPurify export/print path also needs `dompurify`).

## Migration Note

Typst rendering has moved out of `@file-viewer/core` into this package. Core only keeps the `renderFileViewerTypst()` compatibility export with a clear installation error, and no longer installs `@myriaddreamin/*` by default. Install this renderer explicitly, or use `@file-viewer/preset-all`, when real Typst preview is required.
