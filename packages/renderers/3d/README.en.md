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
    backend: 'auto',
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

The optional IFC adapter provides:

- original `.ifc` parsing locally in the browser, without a remote conversion service;
- orbit, pan, zoom, fit-to-model, and responsive WebGL rendering;
- element picking and basic IFC identity/property inspection;
- direct web-ifc and That Open Fragments backends;
- lifecycle cleanup and abort handling;
- a stable Flyfish `ifc.configure(context)` extension point;
- an opaque That Open escape hatch for advanced consumers.

```ts
const options = {
  ifc: {
    async configure(context) {
      const info = await context.getElementInfo(42)
      console.log(context.backend, context.largeModel, context.schema, info.globalId)
      await context.selectElement(42)
      context.fitToModel()
    },
  },
}
```

For That Open-specific configuration, File Viewer intentionally does not mirror every third-party key. `ifc.thatOpen.components` is forwarded to `IfcLoader.setup(...)`, `ifc.thatOpen.fragments` is copied to `FragmentsManager.core.settings`, and `ifc.thatOpen.importer` is forwarded to importer processing options. Raw `configureImporter(...)` and `configure(...)` hooks expose the actual That Open runtime objects without a Flyfish wrapper.

See the dedicated [IFC / BIM guide](https://doc.file-viewer.app/guide/ifc) for the complete pass-through contract and large-model strategy.

BIM authoring/editing, clash detection, BCF, takeoff, sectioning, and measurements remain out of scope.

### Self-hosted IFC runtime

`@file-viewer/assets-ifc` stages the pinned browser runtime required by both IFC backends:

```text
web-ifc-api.js                    -> wasm/model/web-ifc-api.js
web-ifc.wasm                      -> wasm/model/web-ifc.wasm
web-ifc-mt.wasm                   -> wasm/model/web-ifc-mt.wasm
fragments-worker.mjs              -> wasm/model/fragments-worker.mjs
LICENSE.web-ifc-MPL-2.0.md        -> wasm/model/LICENSE.web-ifc-MPL-2.0.md
LICENSE.thatopen-fragments-MIT.txt -> wasm/model/LICENSE.thatopen-fragments-MIT.txt
```

There is no public-CDN fallback. Override `ifc.apiUrl`, `ifc.wasmUrl`, `ifc.wasmMtUrl`, or `ifc.thatOpen.workerUrl` only when using another self-hosted asset layout.

`web-ifc@0.0.77` is MPL-2.0. `@thatopen/components@3.4.8` and `@thatopen/fragments@3.4.7` are MIT-licensed. The File Viewer renderer/capability wrappers remain Apache-2.0.

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
