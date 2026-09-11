# @file-viewer/geometry-engine

Framework-neutral, UI-free geometry kernel for Flyfish File Viewer. It decodes STEP / STP, IGES / IGS, and BREP directly in the browser: OCCT tessellation runs in a local worker, with no upload or server-side conversion. IFC signature detection remains here for routing, while full IFC/BIM visual preview is supplied by the separate explicit `@file-viewer/capability-ifc` integration over `@file-viewer/renderer-3d`. Rhino 3DM still provides signature detection and capability guidance only.

```ts
import { importOcctGeometryFile } from '@file-viewer/geometry-engine'

const result = await importOcctGeometryFile(buffer, 'step', {
  workerUrl: '/viewer-assets/wasm/model/occt-worker.js',
  runtimeUrl: '/viewer-assets/wasm/model/occt-import-js.js',
  wasmUrl: '/viewer-assets/wasm/model/occt-import-js.wasm',
  params: {
    linearUnit: 'millimeter',
    linearDeflectionType: 'bounding_box_ratio',
    linearDeflection: 0.001,
    angularDeflection: 0.5,
  },
})
```

`result` contains the OCCT assembly hierarchy, meshes, normals, indices, and face colors for conversion into Three.js or another rendering layer. Parsing uses a one-shot worker by default and transfers both source bytes and mesh buffers. The worker is released after success, cancellation, failure, or timeout. `timeoutMs` defaults to 120 seconds. Set `useWorker: false` only when workers are genuinely unavailable, because that fallback parses on the main thread.

## Offline Assets

The runtime never falls back to a CDN. Deploy these files with the viewer:

- `wasm/model/occt-worker.js`
- `wasm/model/occt-import-js.js`
- `wasm/model/occt-import-js.wasm`
- `wasm/model/LICENSE.occt.txt`
- `wasm/model/LICENSE.occt-import-js.txt`

These OCCT files are owned by `@file-viewer/assets-model`. IFC has a separate `@file-viewer/assets-ifc` package so its MPL-2.0 `web-ifc` API/WASM files are installed only when the IFC capability is selected.

A strict CSP must at least allow the asset origin in `worker-src`, `script-src`, and `connect-src` for the WASM fetch; some browsers also require `script-src 'wasm-unsafe-eval'` to compile WebAssembly. The classic worker loads the local runtime with `importScripts()`, so allowing only the WASM file is not sufficient.

## Boundaries

- `inspectGeometryKernelFile()` still offers prefix-only detection for common STEP / IGES / IFC / 3DM / BREP signatures.
- STEP / STP, IGES / IGS, and BREP use `occt-import-js` / OpenCascade and have a complete mesh-preview path.
- IFC visual preview is optional and lives in `@file-viewer/capability-ifc` + `@file-viewer/assets-ifc`; it is intentionally not part of this geometry kernel or the default preset closure.
- 3DM still needs a dedicated McNeel `rhino3dm` path and is not presented as fully previewable yet.
- The OCCT and `occt-import-js` license notices must ship with the offline assets.

Keeping these heavy paths separated lets `@file-viewer/core` stay small while Worker/WASM, licensing, and real engineering-file regressions remain independently maintainable.
