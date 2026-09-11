# @file-viewer/renderer-3d

Standalone 3D model renderer for Flyfish File Viewer. It uses Three.js, OrbitControls, and lazy format-specific loaders for GLB / GLTF, OBJ, STL, PLY, FBX, DAE, 3DS, 3MF, AMF, USD, KMZ, PCD, VRML, XYZ, VTK, and related files. STEP / STP, IGES / IGS, and BREP use a self-hosted OCCT worker.

IFC/BIM support is an **explicit opt-in capability**. The base renderer keeps the `.ifc` routing hook but does not depend on `web-ifc`, `@thatopen/components`, or `@thatopen/fragments`; install and import `@file-viewer/capability-ifc` plus its separate `@file-viewer/assets-ifc` package when IFC preview is required. This keeps the heavy BIM runtime outside ordinary 3D, Engineering preset, and Full-package installs.

## Base 3D usage

```ts
import { modelRenderer } from '@file-viewer/renderer-3d'

const options = {
  rendererMode: 'replace',
  renderers: [modelRenderer],
  model: {
    workerUrl: '/file-viewer/wasm/model/occt-worker.js',
    runtimeUrl: '/file-viewer/wasm/model/occt-import-js.js',
    wasmUrl: '/file-viewer/wasm/model/occt-import-js.wasm',
  },
}
```

`modelRenderer` is included by `@file-viewer/preset-engineering` and `@file-viewer/preset-all`. That does **not** activate IFC.

## Enable IFC / BIM explicitly

```bash
npm install @file-viewer/capability-ifc @file-viewer/assets-ifc
```

```ts
import '@file-viewer/capability-ifc'

const options = {
  ifc: {
    fitToModel: true,
    enableSelection: true,
    showProperties: true,
  },
}
```

CLI-managed projects can select the same capability with:

```bash
npx file-viewer-cli config add ifc --write
npx file-viewer-cli install --yes
```

Without the capability import, opening `.ifc` fails with an explicit opt-in message rather than silently loading a heavy runtime.

### IFC backend and large-model routing

The capability supports `ifc.backend: 'auto' | 'web-ifc' | 'thatopen'`.

- `auto` keeps normal/smaller IFCs on the direct `web-ifc` + Three.js renderer and prefers That Open Components + Fragments for files at or above the default 16 MiB threshold.
- `web-ifc` forces the direct renderer.
- `thatopen` forces the worker-backed Fragments renderer.

The threshold and optional hard source ceiling are configurable:

```ts
const options = {
  ifc: {
    performance: {
      largeModelThresholdBytes: 24 * 1024 * 1024,
      preferFragmentsForLargeModels: true,
      // maxSourceBytes: 750 * 1024 * 1024,
    },
  },
}
```

Large Fragments models avoid eager full-element counting and keep culling / LOD operations behind the self-hosted Fragments worker. Properties remain demand-driven by selection.

### IFC feature boundary

IFC is an explicit optional capability. Once enabled, **all** IFC files use That Open Components + Fragments, while web-ifc remains the parser/WASM engine underneath `IfcLoader`. There is no size-dependent backend switch. `largeModelThresholdBytes` only changes performance policy (for example, suppressing eager statistics); `maxSourceBytes` is an optional hard application guard. Advanced consumers can pass opaque `thatOpen.components`, `thatOpen.fragments`, and `thatOpen.importer` objects and use raw runtime hooks. See `docs/guide/ifc.md`.

Self-hosted IFC assets are `web-ifc.wasm`, `web-ifc-mt.wasm`, `fragments-worker.mjs`, and their MPL-2.0/MIT notices.

## Other 3D assets

Default OCCT paths:

- `wasm/model/occt-worker.js`
- `wasm/model/occt-import-js.js`
- `wasm/model/occt-import-js.wasm`

These are owned by `@file-viewer/assets-model`. A strict CSP must allow the configured worker/script/connect origins; some browsers also require `script-src 'wasm-unsafe-eval'`.

## Boundaries

- STEP / STP, IGES / IGS, and BREP are tessellated by `occt-import-js` / OpenCascade in a worker.
- General models support WebGL orbit controls, fit-to-view, grid, axes, wireframe, and auto-rotate.
- IFC becomes available only after `@file-viewer/capability-ifc` activation; its parser/Fragments runtime is browser-local and self-hosted.
- 3DM still provides signature detection/integration guidance only and needs a dedicated `rhino3dm` path.
