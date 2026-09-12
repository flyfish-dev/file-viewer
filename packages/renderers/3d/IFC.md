# Optional IFC viewer

The explicit `@file-viewer/renderer-3d/ifc` entry adds browser-local IFC geometry,
orbit/pan/zoom, fit-to-model, element selection, basic properties and an advanced
That Open hook. It does not change the ordinary 3D entry or the frozen Full/Office
presets. Applications opt in instead of paying the BIM dependency cost by default.

## Install and self-host

```sh
npm install @file-viewer/renderer-3d @thatopen/components@3.4.8 @thatopen/fragments@3.4.7 web-ifc@0.0.77
npm install -D esbuild@0.28.2
npx file-viewer-ifc-assets public/file-viewer/vendor/ifc
```

The asset command is local: it bundles the import Worker and copies the matching
Fragments worker and Web-IFC WASM from installed packages. No CDN or online
conversion service is used. Ship its entire output, including licenses and manifest.
For a nested deployment use the same custom path in the command and `assetBaseUrl`.
Use HTTP(S), module Workers and a browser with WebGL 2. CSP needs `worker-src 'self'
blob:`, WASM execution via `script-src 'wasm-unsafe-eval'`, and the usual local script,
style and data/blob-image permissions of the host. Neither COOP/COEP nor a threaded
WASM build is required for the default single import Worker.

Model identifiers use Three.js's non-security UUID utility, not the secure-context-only
`crypto.randomUUID()` API. The browser regression removes that API before loading both
official models and still verifies selection, properties and complete Worker cleanup.

```ts
import { modelRenderer } from '@file-viewer/renderer-3d'
import { createIfcRenderer } from '@file-viewer/renderer-3d/ifc'

const options = {
  rendererMode: 'extend',
  renderers: [modelRenderer, createIfcRenderer({
    assetBaseUrl: '/file-viewer/vendor/ifc/',
    fitToModel: true,
    enableSelection: true,
    showProperties: true,
    onSelectionChange(selection) {
      console.log(selection?.name, selection?.globalId, selection?.entityType)
    }
  })]
}
// Pass these options to the normal FileViewer component. Set file to the IFC file.
```

`modelRenderer` owns the base model registry definition; the IFC plugin enhances
only its `ifc` extension and leaves GLB/STL/STEP and other model routes unchanged.
When the host already installs the ordinary model renderer, only add the IFC plugin.

## Advanced extension

```ts
const ifc = createIfcRenderer({
  configure({ components, fragments, world, model, signal, select }) {
    // components/world: That Open Components; fragments: FragmentsModels core.
    // model: the loaded FragmentsModel. No cloned internal substitute objects.
    const handler = () => { /* host-owned integration */ }
    window.addEventListener('my-bim-action', handler, { signal })
    return () => window.removeEventListener('my-bim-action', handler)
  }
})
```

### Pre-import settings and pre-model runtime hook

This data-only bridge incorporates the advanced configuration direction proposed
by @p4535992 in PR #275, on the owned-Worker architecture from PR #276. It does not
add the draft's duplicate runtime or separate capability/assets packages.

```ts
createIfcRenderer({
  thatOpen: {
    importer: {
      webIfcSettings: { COORDINATE_TO_ORIGIN: true, CIRCLE_SEGMENTS: 24 },
      geometryProcessSettings: { threshold: 3000 },
      includeMaterialProperties: true
    },
    fragments: { settings: { maxUpdateRate: 80 } }
  },
  configureRuntime({ components, fragments, world, signal }) {
    // Actual adapter-owned objects, before fragments.load() creates the model.
    // Configure Components/camera/scene here, not through private-field assignment.
    const handler = () => { /* application-specific integration */ }
    window.addEventListener('bim-settings', handler, { signal })
    return () => window.removeEventListener('bim-settings', handler)
  },
  configure({ model }) {
    // Existing post-load hook remains available.
  }
})
```

`thatOpen.importer` accepts existing public data fields on the installed
`IfcImporter`; `thatOpen.fragments.settings` accepts public writable fields on
`FragmentsModels.settings`. These are advanced, upstream-version-coupled APIs,
not a normalization of every That Open release. Omitted fields preserve defaults.
Nested Loader/geometry bags are merged; native Sets/Maps replace contents while
retaining library-owned collection instances. Use native `Set` for
`attributesToExclude` and native `Map` for `relations`.

Settings are copied before Worker allocation or copying file bytes. Only plain
data, finite numbers, arrays and native Sets/Maps are accepted, limited to 2,048
nodes, eight nesting levels and 65,536 cumulative string/key characters. Functions,
accessors, class instances, cycles, prototype/private keys and custom collection
properties are rejected. WASM locations, executable methods and Worker ownership
remain adapter-controlled. Unknown top-level fields fail rather than being ignored.
The Worker validates settings again before parsing. These shape/size guards do
not replace upstream documentation for valid option values; configuration is
trusted application code, never document-supplied executable metadata.

Both hooks may be asynchronous and return synchronous cleanup. Cleanup runs once
in reverse registration order, including late completion after cancellation. A
failing cleanup does not prevent other hooks or Workers/WebGL from being disposed.
Never dispose adapter-owned objects or replace their Worker/lifecycle methods.

The adapter owns and disposes these objects. Do not dispose them in the hook.
Return cleanup for your own resources. A late async hook is cleaned up after
cancellation. The explicit `renderFileViewerIfc` API also returns `select(id|null)`,
`fitToModel()` and an idempotent asynchronous `unmount()`.

Parsing runs in a dedicated module Worker. Closing/changing the file aborts imports,
terminates import workers, releases Fragments workers/models and disposes WebGL and
camera controls. Input size defaults to 512 MiB and the loading timeout to 120 seconds;
`maxFileBytes` and `loadTimeoutMs` allow smaller product-specific limits. These are
safety limits, not promises that every 512 MiB model is interactive on every device.

## Scope and licenses

The initial scope is visual inspection, not authoring, BCF, clash detection,
measurements or complete BIM semantics. IFC4 and IFC4.3 building samples are used
for the repeatable browser gate. Fonts, textures and references outside the IFC
are not fetched from remote services. Complex or unsupported geometry remains
subject to Web-IFC's capabilities; parse failures are explicit.

That Open Components and Fragments are MIT. Web-IFC is MPL-2.0, isolated behind this
optional entry; the File Viewer adapter remains Apache-2.0. Preserve the copied
MPL license, corresponding-source notice and bundled legal notices when distributing
WASM/worker files. Fragments' upstream MIT text is retained in `licenses/` because
its published tarball does not contain its root license file. Source:
https://github.com/ThatOpen/engine_fragment/blob/main/LICENSE.md

## Regression fixture attribution

buildingSMART International Ltd., Certification-datasets, CC BY 4.0:
https://github.com/buildingSMART/Certification-datasets
Revision: `80d976a9b193a26a8e928c3e79bff67af1de68a8`.

- `IFC 4.0.2.1 (IFC 4 ADD2 TC1)/Simple-Scene/Building-Architecture.ifc`
- `IFC 4.3.2.0 (IFC 4.3 ADD2)/Simple-Scene/Building-Architecture.ifc`

The input files are unmodified. Test screenshots are rendered derivatives.
Fixture bytes are supplied separately; the browser script checks their SHA-256.
Run `pnpm --filter @file-viewer/renderer-3d verify:ifc-browser /path/to/fixtures`
with `ifc4.ifc` and `ifc43.ifc` in that directory after building the package.
