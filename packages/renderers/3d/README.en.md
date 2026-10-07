# @file-viewer/renderer-3d

Standalone 3D model renderer for Flyfish File Viewer. It uses Three.js, OrbitControls, and lazy format-specific loaders for GLB / GLTF, OBJ, STL, PLY, FBX, DAE, 3DS, 3MF, AMF, USD, KMZ, PCD, VRML, XYZ, VTK, and related files. STEP / STP, IGES / IGS, and BREP use a local OCCT worker for real geometry decoding and rendering.

## Usage

```ts
import FileViewer from '@file-viewer/vue3'
import { modelRenderer } from '@file-viewer/renderer-3d'

const options = {
  rendererMode: 'replace',
  renderers: modelRenderer,
  model: {
    workerUrl: '/viewer-assets/wasm/model/occt-worker.js',
    runtimeUrl: '/viewer-assets/wasm/model/occt-import-js.js',
    wasmUrl: '/viewer-assets/wasm/model/occt-import-js.wasm',
    workerTimeoutMs: 120_000,
  },
}
```

`modelRenderer` can be combined with CAD and other renderer packages, or consumed through `@file-viewer/preset-all`. Full packages and `@file-viewer/vite-plugin` prepare the default offline assets. A renderer-only integration must self-host the OCCT worker, runtime, WASM, and both license notices.

Specialist capabilities stay opt-in through separate subpath entries: `@file-viewer/renderer-3d/ifc` for IFC and `@file-viewer/renderer-3d/geo3d` for LAS / LAZ / COPC / GeoTIFF / COG / CityJSON / 3D Tiles / 3TZ. Neither sub-entry is imported by the ordinary model renderer or added implicitly to Full presets. See `IFC.md` and `GEO3D.md` for installation, self-hosted runtime assets, and configuration.

Default paths:

- `wasm/model/occt-worker.js`
- `wasm/model/occt-import-js.js`
- `wasm/model/occt-import-js.wasm`

For subpath deployments or a dedicated asset origin, provide final URLs through `options.model.workerUrl`, `runtimeUrl`, and `wasmUrl`. There is no runtime CDN fallback. A strict CSP must allow that origin in `worker-src`, `script-src`, and `connect-src`; some browsers also require `script-src 'wasm-unsafe-eval'`.

## Boundaries

- STEP / STP, IGES / IGS, and BREP are tessellated by `occt-import-js` / OpenCascade in a worker. Assembly hierarchy, instances, normals, and face colors are preserved when the Three.js scene is built.
- General models support WebGL orbit controls, fit-to-view, grid, axes, wireframe, and auto-rotate. External textures or binary resources referenced by `gltf`, `dae`, and `fbx` continue to resolve against the original file URL directory.
- Unified global zoom: the renderer registers the standard zoom provider, so the outer toolbar's zoom in, zoom out, reset, and fit actions control the camera. Wheel, trackpad, and pinch zoom also update the shared zoom state.
- IFC is available through the explicit `@file-viewer/renderer-3d/ifc` specialist entry. Streaming COPC / 3D Tiles are available through the explicit `@file-viewer/renderer-3d/geo3d` entry. 3DM still needs a dedicated `rhino3dm` renderer.
- `@file-viewer/core` does not bundle Three.js or a geometry kernel. Install this renderer, the matching preset, or a full package when model preview is required.
