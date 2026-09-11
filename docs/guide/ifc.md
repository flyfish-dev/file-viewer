# IFC / BIM Optional Capability

<div class="doc-kicker">Local BIM Preview, Explicitly Opted In</div>

<p class="doc-lead">
  IFC is a specialist capability layered over the normal 3D renderer. It stays outside Engineering / Full default dependency closures, parses original IFC bytes in the browser, and can switch between a direct web-ifc renderer and a worker-backed That Open Fragments path.
</p>

## Install

```bash
npm install @file-viewer/renderer-3d @file-viewer/capability-ifc @file-viewer/assets-ifc
```

```ts
import { modelRenderer } from '@file-viewer/renderer-3d'
import '@file-viewer/capability-ifc'

const options = {
  rendererMode: 'extend',
  renderers: [modelRenderer],
}
```

The capability is not activated by `@file-viewer/preset-engineering`, `@file-viewer/preset-all`, or the Full compatibility packages. CLI-managed applications can opt in with:

```bash
npx file-viewer-cli config add ifc --write
npx file-viewer-cli install --yes
```

The matching `@file-viewer/assets-ifc` payload must be self-hosted under the normal File Viewer asset root. File Viewer does not fall back to a public CDN.

## Backend selection

```ts
const options = {
  ifc: {
    backend: 'auto', // 'auto' | 'web-ifc' | 'thatopen'
  },
}
```

`auto` is designed for the normal product path:

- smaller IFC files use the direct `web-ifc` + Three.js adapter;
- files at or above 16 MiB prefer That Open Components + Fragments;
- providing `ifc.thatOpen` also selects the That Open path in `auto` mode, because the caller explicitly requested That Open configuration;
- `web-ifc` and `thatopen` can be forced when an application needs deterministic backend selection.

The threshold is a routing heuristic, not a promise that every file below it is cheap or every file above it is expensive. Applications can tune it from observed production models.

## Large IFC files

```ts
const options = {
  ifc: {
    performance: {
      largeModelThresholdBytes: 24 * 1024 * 1024,
      preferFragmentsForLargeModels: true,
      // Optional product/security policy; there is no hard default ceiling.
      maxSourceBytes: 750 * 1024 * 1024,
    },
  },
}
```

The That Open path is used for large models because Fragments is worker-backed and maintains its own culling / LOD representation. File Viewer deliberately avoids eagerly enumerating all geometry element IDs for large files merely to display a count; element data stays demand-driven and the property panel loads the selected element only.

This improves responsiveness and memory behavior, but it cannot make source parsing free: the browser still receives the original IFC bytes and conversion to Fragments still needs CPU and memory. `maxSourceBytes` exists so deployments with known device limits can reject a source before parser state is allocated.

## Extensibility contract

The stable Flyfish layer should remain small: `backend`, fit, selection, properties, asset URLs, performance policy, and `configure(context)`.

That Open changes more quickly than the File Viewer public API. Mirroring every That Open field would force File Viewer to rename and release options every time Components or Fragments changes. Instead, the capability provides an explicit opaque bridge.

### Components pass-through

`ifc.thatOpen.components` is forwarded as the object passed to `@thatopen/components` `IfcLoader.setup(...)` after File Viewer applies its offline-safe self-hosted defaults.

```ts
const options = {
  ifc: {
    backend: 'thatopen',
    thatOpen: {
      components: {
        autoSetWasm: false,
        webIfc: {
          CIRCLE_SEGMENTS: 7,
        },
      },
    },
  },
}
```

File Viewer does not translate individual keys in this object. Unsupported keys therefore follow the behavior of the pinned That Open version rather than a separate Flyfish compatibility layer.

### Fragments pass-through

`ifc.thatOpen.fragments` is copied directly to `FragmentsManager.core.settings`.

```ts
const options = {
  ifc: {
    thatOpen: {
      fragments: {
        maxUpdateRate: 73,
      },
    },
  },
}
```

This is intentionally an open dictionary so new Fragments settings can be used before File Viewer publishes a matching typed field.

### Importer pass-through

`ifc.thatOpen.importer` is passed through to the Fragments IFC importer processing options.

```ts
const options = {
  ifc: {
    thatOpen: {
      importer: {
        // Current @thatopen/fragments IfcImporter processing options go here.
      },
    },
  },
}
```

### Imperative escape hatches

Not every library API is JSON-shaped. For that reason, the capability also exposes raw runtime objects without wrapping their methods:

```ts
const options = {
  ifc: {
    thatOpen: {
      configureImporter({ importer, modules, components, fragments, loader, world }) {
        // Called before importer processing starts.
      },
      async configure({ modules, components, fragments, loader, importer, world, model }) {
        // Called after the Fragments model is ready.
      },
    },

    async configure(context) {
      // Stable Flyfish-level context for either backend.
      console.log(context.backend, context.fileSizeBytes, context.largeModel)

      // Present only for the That Open backend.
      console.log(context.thatOpen)
    },
  },
}
```

The raw objects are typed as `unknown` at the Flyfish boundary on purpose. Advanced applications should cast them to the exact `@thatopen/components` / `@thatopen/fragments` types they install. This avoids freezing third-party implementation types into the core File Viewer contract.

## Self-hosted assets

`@file-viewer/assets-ifc` pins and stages:

```text
web-ifc-api.js
web-ifc.wasm
web-ifc-mt.wasm
fragments-worker.mjs
LICENSE.web-ifc-MPL-2.0.md
LICENSE.thatopen-fragments-MIT.txt
```

Custom paths can be supplied with `ifc.apiUrl`, `ifc.wasmUrl`, `ifc.wasmMtUrl`, and `ifc.thatOpen.workerUrl`.

## Supported viewer scope

The capability is focused on review and inspection:

- browser-local IFC opening;
- orbit / pan / zoom and fit-to-model;
- element picking;
- entity identity, `Name`, `GlobalId`, and bounded property inspection;
- lifecycle cleanup and abort handling;
- backend-specific advanced customization through the bridge above.

BIM authoring/editing, clash detection, BCF workflows, quantity takeoff, sectioning, and measurement remain outside the initial capability.

## Regression coverage

`test/fixtures/ifc/` contains two unchanged buildingSMART IFC4 Simple-Scene files with their CC BY 4.0 attribution/license and SHA-256 checksums. `test/ifc-optional-capability.spec.ts` guards the optional dependency boundary, license notices, backend routing, hard source-size guard, and the opaque pass-through contract. The permanent IFC validation workflow also opens real committed fixtures in Chromium using the self-hosted assets and exercises both the direct and That Open paths.
