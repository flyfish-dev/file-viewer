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

    ```ts
    {
      cad: {
        colorMode: 'monochrome',
        monochromeColor: '#000000',
        showColorModeToggle: true,
      },
    }
    ```
