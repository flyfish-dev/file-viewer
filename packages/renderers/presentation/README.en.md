# @file-viewer/renderer-presentation

Standalone presentation renderer package for Flyfish File Viewer. Binary PowerPoint 97–2003 `.ppt` uses the separate `@file-viewer/ppt@0.3.3` Worker/OffscreenCanvas/WASM path; PPTX/PPTM/POTX/POTM/PPSX/PPSM keep the progressive `@file-viewer/pptx` path. Both integrate with the shared zoom, print, and HTML export controls.

## Usage

```ts
import FileViewer from '@file-viewer/vue3'
import { presentationRenderer } from '@file-viewer/renderer-presentation'

const options = {
  rendererMode: 'replace',
  renderers: presentationRenderer,
}
```

When an application needs only one PowerPoint family, use a stable subpath so the other engine stays out of the production bundle:

```ts
import { pptRenderer } from '@file-viewer/renderer-presentation/ppt'
import { pptxRenderer } from '@file-viewer/renderer-presentation/pptx'

const pptxOnlyOptions = {
  rendererMode: 'replace',
  renderers: pptxRenderer,
}
```

Vite can generate the same PPTX-only import:

```ts
import { fileViewerRenderers } from '@file-viewer/vite-plugin'

fileViewerRenderers({ formats: ['pptx'] })
```

This configuration does not emit the classic `.ppt` CJK font or WASM in production. Keep using the root `presentationRenderer` when both families are required.

You can compose it with other renderers:

```ts
const options = {
  rendererMode: 'replace',
  renderers: [presentationRenderer],
}
```

## Notes

- Binary `.ppt` and OOXML presentations use separate parsers; classic PPT bytes are never sent to the ZIP/PPTX parser.
- `odp` remains handled by the core OpenDocument compatibility renderer, keeping different format families separated.
- File Viewer lazy-loads the independently versioned public `.ppt` engine. Demo, full asset packages, and CDN/IIFE distributions ship its matching ESM, Worker, WASM, CJK font, and frame-cache files under `vendor/ppt/`, so the default path needs no extra configuration.
- Version 0.3.3 defaults to a module Worker and OffscreenCanvas in capable browsers, with a bounded IndexedDB frame cache for revisited slides. It falls back to the asynchronous direct path when needed.
- `options.presentation.pptModuleUrl`, `pptWorkerUrl`, `pptWasmUrl`, and `pptFontUrl` are advanced overrides for custom static asset routes. `pptWorker` and `pptCache` control Worker and bounded-cache behavior.
- `@file-viewer/ppt` keeps its included license and is not covered by this renderer's Apache-2.0 license. The public runtime keeps its visible watermark; removing the PPT watermark requires commercial authorization. The engine also requires Web Crypto SHA-256, normally available on HTTPS or localhost.

## Migration

`@file-viewer/core` no longer depends on `@file-viewer/pptx` directly. PowerPoint preview is provided by this renderer package and `@file-viewer/preset-all`. Core-only installs show a clear missing-renderer message for PPTX; pass `allRenderers` when you need the same complete format matrix as the official demo.
