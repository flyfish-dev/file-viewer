# IFC / BIM Optional Capability

<div class="doc-kicker">Local BIM Preview, Explicitly Opted In</div>

<p class="doc-lead">
IFC is an optional specialist capability layered over the normal 3D renderer. Every IFC file uses the same That Open Components + Fragments pipeline, with web-ifc as the underlying IFC parser/WASM engine. The capability stays outside Engineering / Full default dependency closures and uses only self-hosted runtime assets.
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

CLI-managed applications can opt in with `npx file-viewer-cli config add ifc --write` followed by `npx file-viewer-cli install --yes`. There is no public-CDN fallback.

## One IFC pipeline

```text
Flyfish File Viewer
        ↓
@file-viewer/capability-ifc
        ↓
That Open Components / IfcLoader
        ↓
web-ifc parser + WASM
        ↓
That Open Fragments + worker
        ↓
interactive BIM viewer
```

There is no public backend selector. Small and large IFC files use the same pipeline, so selection, properties, cleanup and rendering semantics do not diverge by file size.

## Large IFC files

```ts
const options = {
  ifc: {
    performance: {
      largeModelThresholdBytes: 24 * 1024 * 1024,
      maxSourceBytes: 750 * 1024 * 1024, // optional application policy
    },
  },
}
```

`largeModelThresholdBytes` classifies a model for performance policy only; it does not switch rendering engines. Fragments/worker/culling are used for every IFC. For models classified as large, File Viewer avoids eager element enumeration purely for toolbar statistics. Properties remain demand-driven. `maxSourceBytes` is an optional pre-initialization safety ceiling.

## Extensibility contract

Flyfish keeps the stable surface small and provides an opaque That Open bridge rather than mirroring third-party option schemas.

```ts
const options = {
  ifc: {
    thatOpen: {
      components: {
        // forwarded unchanged to IfcLoader.setup(...)
        webIfc: { CIRCLE_SEGMENTS: 7 },
      },
      fragments: {
        // copied unchanged to FragmentsManager.core.settings
        maxUpdateRate: 73,
      },
      importer: {
        // forwarded unchanged to Fragments IFC importer processing options
      },
      configureImporter({ importer, loader, webIfc }) {
        // raw imperative escape hatch before importer processing
      },
      async configure({ components, world, fragments, loader, webIfc, importer, model, modules }) {
        // raw That Open runtime objects; no Flyfish wrapper is inserted
      },
    },
    async configure(context) {
      console.log(context.fileSizeBytes, context.largeModel)
      console.log(context.thatOpen.webIfc)
    },
  },
}
```

The pass-through objects are deliberately open dictionaries (`[key: string]: unknown`). Advanced applications can cast raw objects to the exact pinned That Open types they install.

## Self-hosted assets and licenses

`@file-viewer/assets-ifc` stages:

```text
web-ifc.wasm
web-ifc-mt.wasm
fragments-worker.mjs
LICENSE.web-ifc-MPL-2.0.md
LICENSE.thatopen-fragments-MIT.txt
```

`web-ifc@0.0.77` is MPL-2.0. `@thatopen/components@3.4.8` and `@thatopen/fragments@3.4.7` are MIT. The Flyfish capability wrapper remains Apache-2.0.

## Scope and regression coverage

The capability provides local IFC opening, orbit/pan/zoom, fit-to-model, element picking, identity/Name/GlobalId/property inspection, cleanup and advanced raw customization. BIM authoring/editing, clash detection, BCF, takeoff, sectioning and measurement remain out of scope.

The repository commits two buildingSMART IFC4 fixtures with CC BY 4.0 attribution. The permanent IFC validation workflow renders small and forced-large cases through the same That Open/Fragments stack in Chromium and runs the full Flyfish build/type-check/test gates.
