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
