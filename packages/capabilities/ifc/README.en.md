# @file-viewer/capability-ifc

Explicit opt-in IFC/BIM capability for `@file-viewer/renderer-3d`. Importing this package enables the lazy IFC adapter; applications that do not install/import it keep `web-ifc`, That Open Components/Fragments, and their WASM/worker runtime outside their dependency and asset closure.

```bash
npm install @file-viewer/renderer-3d @file-viewer/capability-ifc @file-viewer/assets-ifc
```

```ts
import { modelRenderer } from '@file-viewer/renderer-3d'
import '@file-viewer/capability-ifc'

const options = {
  rendererMode: 'extend',
  renderers: [modelRenderer],
  ifc: {
    fitToModel: true,
    enableSelection: true,
    showProperties: true,
  },
}
```

Publish the matching `@file-viewer/assets-ifc` files under the normal File Viewer asset root. The pack contains the pinned `web-ifc` browser ESM/WASM runtime and the matching self-hosted That Open Fragments worker. You can override `ifc.apiUrl`, `ifc.wasmUrl`, `ifc.wasmMtUrl`, and `ifc.thatOpen.workerUrl`; File Viewer has no public-CDN fallback.

## Backend and large IFC strategy

`ifc.backend` accepts `auto`, `web-ifc`, or `thatopen`.

- `auto` is the default. Small IFCs keep the direct `web-ifc` + Three.js path. Files at or above `ifc.performance.largeModelThresholdBytes` (16 MiB by default) prefer the worker-backed That Open Fragments path.
- `web-ifc` always uses the direct renderer. This is useful for deterministic compatibility or applications that do not want the Fragments engine for a particular model.
- `thatopen` always uses That Open Components + Fragments.

For large files, the Fragments path keeps rendering/culling/LOD work in the dedicated Fragments worker and avoids eagerly enumerating all element IDs just to populate the toolbar. Properties are still requested on selection. `ifc.performance.maxSourceBytes` is an optional hard source-file guard; File Viewer does not impose a hard default size ceiling.

```ts
const options = {
  ifc: {
    backend: 'auto',
    performance: {
      largeModelThresholdBytes: 24 * 1024 * 1024,
      // maxSourceBytes: 750 * 1024 * 1024, // optional application policy
      preferFragmentsForLargeModels: true,
    },
  },
}
```

## Extensibility: opaque That Open bridge

File Viewer intentionally does **not** mirror every That Open option into a Flyfish-specific schema. The `thatOpen` object is the compatibility hole for advanced consumers:

```ts
const options = {
  ifc: {
    backend: 'thatopen',
    thatOpen: {
      // 1:1 object forwarded to @thatopen/components IfcLoader.setup(...)
      components: {
        autoSetWasm: false,
        webIfc: {
          CIRCLE_SEGMENTS: 7,
        },
      },

      // 1:1 keys copied to FragmentsManager.core.settings
      fragments: {
        maxUpdateRate: 73,
      },

      // 1:1 object forwarded to the Fragments IfcImporter process options
      importer: {
        // Put supported @thatopen/fragments importer keys here.
      },

      // Imperative escape hatch before importer.process(...)
      configureImporter({ importer, modules }) {
        // Cast to the exact That Open version used by your app when needed.
      },

      // Raw runtime objects after the model is ready.
      async configure({ components, world, fragments, loader, importer, model, modules }) {
        // No Flyfish wrapper is inserted between you and That Open here.
      },
    },

    // Stable Flyfish-level hook, independent of the selected backend.
    async configure(context) {
      console.log(context.backend, context.largeModel, context.thatOpen)
    },
  },
}
```

The pass-through objects are deliberately typed as an open dictionary and are not key-translated or version-normalized by Flyfish. That means newly introduced That Open options can be used without waiting for File Viewer to add matching fields. The trade-off is intentional: values inside this escape hatch follow the pinned That Open APIs, while the outer Flyfish options remain the stable contract.

The capability provides browser-local IFC parsing, orbit/pan/zoom, fit-to-model, element picking, `Name` / `GlobalId` / entity inspection, bounded property display, cleanup, and the stable `ifc.configure(context)` hook. BIM authoring, editing, clash detection, BCF, takeoff, sectioning, and measurement remain out of scope.

## Regression fixtures

The repository commits two buildingSMART IFC4 Simple-Scene fixtures under `test/fixtures/ifc/`: `Building-Architecture.ifc` and `Building-Structural.ifc`. Their upstream CC BY 4.0 license, attribution, source path, and SHA-256 checksums are committed beside the files. The permanent IFC validation workflow renders both fixtures in Chromium from the self-hosted runtime; it also forces the That Open backend so the Fragments path is exercised rather than only type-checked.

`web-ifc@0.0.77` is MPL-2.0. `@thatopen/components@3.4.8` and `@thatopen/fragments@3.4.7` are MIT-licensed. The separate asset pack preserves the runtime notices for the files it redistributes; the File Viewer capability wrapper remains Apache-2.0.
