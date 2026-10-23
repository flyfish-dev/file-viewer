# @file-viewer/renderer-eda

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/eda/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/eda/README.zh-CN.md)

Standalone EDA renderer package for Flyfish File Viewer. It handles safe structure previews for OLB, DRA, GDSII, and OASIS files without forcing normal document preview installs to carry EDA parsing code.

## Usage

```ts
import FileViewer from '@file-viewer/vue3'
import { edaRenderer } from '@file-viewer/renderer-eda'

const options = {
  rendererMode: 'replace',
  renderers: edaRenderer,
}
```

Compose it with other renderers when needed:

```ts
import { edaRenderer } from '@file-viewer/renderer-eda'
import { cadRenderer } from '@file-viewer/renderer-cad'

const options = {
  rendererMode: 'replace',
  renderers: [edaRenderer, cadRenderer],
}
```

## Scope

- `gds` reads standard GDSII records and extracts libraries, structures, boundaries, paths, text, references, and coordinate bounds. Small layouts render as SVG; larger element sets automatically use WebGL typed-array batches from `@file-viewer/eda-layout` and a canvas renderer.
- `oas` / `oasis` readable text layout fixtures render as SVG; real SEMI binary OASIS files provide safe binary indexing, readable strings, structure candidates, and diagnostics rather than claiming full geometry rendering.
- `olb` / `dra` use `cfb` to inspect common compound document containers and expose stream trees, entity candidates, properties, strings, and diagnostics.
- GDSII/OASIS primitives now live in `@file-viewer/eda-layout`; OrCAD/Allegro binary inspection primitives now live in `@file-viewer/eda-orcad`. This package focuses on UI presentation, SVG/WebGL selection, and the File Viewer renderer protocol.
- After a web-wide ecosystem review, the boundary stays explicit: GDSII has mature record parser / WebGL viewer paths and is suitable for official quick preview today; OASIS text fixtures validate visible UI output, while real SEMI binary OASIS needs a lower-level parser, repetition expansion, and incremental rendering; OLB / DRA belong to the proprietary OrCAD / Allegro ecosystem, where the sustainable public path is C++ WASM or staged TypeScript ports based on OpenOrCadParser / OpenAllegroParser.
- High-fidelity OrCAD / Allegro / OASIS graphics should evolve as a dedicated WASM or incremental rendering kernel instead of entering core or the default document first-screen path.

## Migration Notes

`@file-viewer/core` no longer bundles the EDA renderer and no longer installs `cfb` by default. Install this package explicitly, or use `@file-viewer/preset-all`, when you need OLB, DRA, GDSII, or OASIS previews. The low-level `parseEdaFile()` API is exported from this package for business-side structure indexing, diagnostics, or future custom WASM engine integration.

## Offline Deployment

The current EDA renderer does not require extra Worker or WASM assets. Larger GDSII layouts use the browser's native WebGL canvas without public CDN dependencies. It only loads `cfb`, `@file-viewer/eda-layout`, `@file-viewer/eda-orcad`, and this UI package when OLB, DRA, GDSII, or OASIS formats are selected.
