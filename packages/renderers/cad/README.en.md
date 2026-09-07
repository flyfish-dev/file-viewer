# @file-viewer/renderer-cad

Standalone CAD renderer package for Flyfish File Viewer. It is powered by `@flyfish-dev/cad-viewer`, previews DWG, DXF, DWF, DWFx, and XPS in the browser, and resolves wasm / worker URLs through the File Viewer asset manifest for offline enterprise deployments.

## Usage

```ts
import FileViewer from '@file-viewer/vue3'
import { cadRenderer } from '@file-viewer/renderer-cad'

const options = {
  rendererMode: 'replace',
  renderers: cadRenderer,
}
```

You can also compose it with other renderer packages:

```ts
import { cadRenderer } from '@file-viewer/renderer-cad'
import { pdfRenderer } from '@file-viewer/renderer-pdf'

const options = {
  rendererMode: 'replace',
  renderers: [pdfRenderer, cadRenderer],
}
```

## Capabilities

- Supports `.dwg`, `.dxf`, `.dwf`, `.dwfx`, and `.xps`.
- DWG is parsed on demand with a worker and LibreDWG WASM to keep the main thread responsive.
- DXF is parsed in JavaScript and normalized into the common CAD document model.
- DWF / DWFx / XPS use the native renderer with `dwfv-render.wasm` for performant raster / WebGL fallback.
- Includes layer toggling, structure stats, fit-to-view, zoom controls, global toolbar zoom provider, and resize handling.

## Offline Assets

The default asset paths are:

- `wasm/cad/`
- `wasm/cad/dwg-worker.js`
- `wasm/cad/dwfv-render.wasm`
- `wasm/cad/libredwg-web.js`
- `wasm/cad/libredwg-web.wasm`

For private deployments, override them with `options.cad.wasmPath`, `options.cad.workerUrl`, and `options.cad.dwfWasmUrl`.

## Migration Note

CAD preview has moved completely out of `@file-viewer/core`. Core now only keeps the asset manifest, shared types, and a compatibility error message, and it no longer installs `@flyfish-dev/cad-viewer` by default. Install this package and pass it through `renderers`, or use `@file-viewer/preset-all` for the complete CAD experience.

## Monochrome plot mode

Set `cad.colorMode` to `source` or `monochrome`. Monochrome rendering uses the CAD engine's entity-color policy rather than a CSS filter, keeping Canvas, WebGL, text overlays and native DWF output consistent while preserving alpha, line types, line weights and source data.

Source mode defaults to a dark background; monochrome defaults to black lines on white paper. Adaptive contrast makes lines and text near the background color readable. Use `cad.canvasOptions.contrastMode: 'preserve'` for exact source colors. Explicit `cad.canvasOptions.background` / `cad.dwfBackground` values survive mode changes.

```ts
{
  cad: {
    colorMode: 'monochrome',
    monochromeColor: '#000000',
    showColorModeToggle: true,
  },
}
```

### Images, print and offline HTML

Select the color mode, then use Print or HTML in the shared toolbar. Output redraws and captures the current view, including WebGL lines and text overlays, without layer panels or controls. HTML embeds a PNG instead of a temporary blob URL. The print window supports the browser's Save as PDF and retains File Viewer permission checks, watermarks and masks.

PNG and JPEG buttons download the same rendered view, including configured text or image watermarks. Both `toolbar.permissions.download` and `toolbar.permissions['export-html']` must allow the operation. The owning viewer runs its normal `beforeOperation`, toolbar `beforeOperation` and `beforeDownload` hooks before capture; cancellation or a document/permission change prevents the download. Use `cad.showImageExport: false` to hide these renderer-local buttons. A missing watermark fails explicitly without breaking the live preview. Print masks apply to Print, not to image downloads.

This is a raster snapshot of the current camera view / current DWF page, not a vector conversion or batch export of every sheet. Use Fit first to include the full drawing. Original-file download never changes the input bytes.
