# @file-viewer/geometry-engine

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/geometry-engine/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/geometry-engine/README.zh-CN.md)

Framework-neutral, UI-free geometry kernel for Flyfish File Viewer. It now decodes STEP / STP, IGES / IGS, and BREP directly in the browser: OCCT tessellation runs in a local worker, with no upload or server-side conversion. IFC and Rhino 3DM currently provide signature detection and accurate capability notices only; their full geometry renderers are not wired yet.

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

`@file-viewer/vite-plugin`, full packages, and the repository build scripts copy these assets. A bare package integration must self-host them and provide `workerUrl`, `runtimeUrl`, and `wasmUrl`. For subpath deployments, asset domains, or controlled gateways, pass final absolute URLs or correctly prefixed URLs instead of relying on the site root.

A strict CSP must at least allow the asset origin in `worker-src`, `script-src`, and `connect-src` for the WASM fetch; some browsers also require `script-src 'wasm-unsafe-eval'` to compile WebAssembly. The classic worker loads the local runtime with `importScripts()`, so allowing only the WASM file is not sufficient.

## Boundaries

- `inspectGeometryKernelFile()` still offers prefix-only detection for common STEP / IGES / IFC / 3DM / BREP signatures.
- STEP / STP, IGES / IGS, and BREP use `occt-import-js` / OpenCascade and have a complete mesh-preview path.
- IFC still needs a dedicated `web-ifc` / That Open integration; 3DM still needs McNeel `rhino3dm`. Neither format is presented as fully previewable yet.
- The OCCT and `occt-import-js` license notices must ship with the offline assets.

Keeping this heavy path in a separate package lets `@file-viewer/core` stay small while worker, WASM, licensing, and real engineering-file regressions remain independently maintainable.
