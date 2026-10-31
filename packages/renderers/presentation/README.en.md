# @file-viewer/renderer-presentation

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/presentation/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/presentation/README.zh-CN.md)

Standalone presentation renderer package for Flyfish File Viewer. Binary PowerPoint 97–2003 `.ppt` / `.pot` uses the separate `@file-viewer/ppt@1.0.1` TypeScript engine; PPTX/PPTM/POTX/POTM/PPSX/PPSM use `@file-viewer/pptx`. Both integrate with the shared zoom, print, and HTML export controls.

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

This configuration keeps the binary `.ppt` engine out of production. Keep using the root `presentationRenderer` when both families are required.

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
- File Viewer lazy-loads the independently versioned `.ppt` engine. Demo, Full packages and CDN/IIFE distributions include the verified package under `vendor/ppt/`; the standalone module and parsing Worker are in `vendor/ppt/dist/`. Deploy the complete generated assets to use the default URLs.
- The TypeScript engine parses in a module Worker and performs SVG layout and Canvas snapshots on the main thread. It falls back to direct parsing when Workers are unavailable. It needs no WASM or embedded font pack; browser fonts determine text layout.
- `options.presentation.pptModuleUrl` and `pptWorkerUrl` override custom static routes; `pptWorker` selects the parsing path. Previous `pptWasmUrl`, `pptFontUrl` and `pptCache` options are accepted for migration and do not load native assets or enable persistent caching.
- The public compiled TypeScript runtime is Apache-2.0; its source remains private. Preserve its LICENSE and NOTICE.md. This does not change the license or watermark requirements of previous native/WASM releases. Complex effects and missing host fonts can still change the preview.

## Migration

`@file-viewer/core` no longer depends on `@file-viewer/pptx` directly. PowerPoint preview is provided by this renderer package and `@file-viewer/preset-all`. Core-only installs show a clear missing-renderer message for PPTX; pass `allRenderers` when you need the same complete format matrix as the official demo.
