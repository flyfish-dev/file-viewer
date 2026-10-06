# @file-viewer/renderer-dicom

An explicitly installed DICOM renderer for local DICOM Part 10 files. It uses the modular Cornerstone3D core and DICOM image-loader packages; it does not embed the OHIF application and does not use DCMTK.

The package declares the browser `events` implementation required by `dcmjs`'s transitive XML builder. Standalone browser consumers must not depend on an unrelated workspace package supplying it.

This package is intentionally excluded from File Viewer full and preset packages. Applications that need medical imaging install and register it explicitly.

Core, image-loader and metadata use Cornerstone 5.10.11 together. This is the last 5.10 release before the image-loader adds the Node >=24 JPEG XL dependency; genuine cold installation with `engine-strict` passes on Node 22.16.0. The existing transitive `dcmjs` dependency requires Node >=22.13.0, so this is not a Node 20 compatibility claim. JPEG XL and HTJ2K remain outside the tested Part 10 scope below.

The upstream dependency closure still pins vulnerable versions of `adm-zip`, `uuid` and `fflate`. File Viewer's workspace overrides fix them, but a library's workspace policy does not propagate to an installing application. Apply the following scoped policy in the application root and commit its lockfile. A default install without these overrides does not pass the security audit.

For npm, add this field to the application's `package.json`:

```json
{
  "overrides": {
    "dcmjs": { "adm-zip": "0.6.1" },
    "@cornerstonejs/dicom-image-loader": { "uuid": "11.1.1" },
    "@kitware/vtk.js": { "fflate": "0.7.5" }
  }
}
```

For pnpm, add this policy to the application's `pnpm-workspace.yaml`:

```yaml
overrides:
  'dcmjs>adm-zip': 0.6.1
  '@cornerstonejs/dicom-image-loader>uuid': 11.1.1
  '@kitware/vtk.js>fflate': 0.7.5
allowBuilds:
  core-js-pure: false
```

The pnpm 11 policy explicitly skips `core-js-pure`'s optional postinstall donation banner; it does not generate runtime files. Other dependency build permissions remain subject to the application's policy.

Then install and audit against the official npm registry (`npm audit` or `pnpm audit`). Register the renderer after installing it:

```ts
import { createViewer } from '@file-viewer/core'
import { dicomRenderer } from '@file-viewer/renderer-dicom'

const viewer = createViewer(container, {
  rendererMode: 'replace',
  renderers: [dicomRenderer],
})
```

The first scope accepts Implicit/Explicit/Deflated Explicit VR Little Endian, JPEG Lossless Process 14 SV1, JPEG-LS Lossless, and JPEG 2000 Lossless Part 10 files covered by Chromium, Firefox, and WebKit regression (single-frame or multi-frame). It provides stack navigation, window width/center, zoom, pan, left/right 90° rotation, fit-to-view, and unified File Viewer view-state restoration. Other transfer syntaxes, PACS/DICOMweb, multi-file series assembly, annotations, MPR, segmentation, hanging protocols, and diagnostic use are outside this package.

The package initializes codec workers only after a DICOM file is selected. Defaults are limited to a 64 MiB source, 256 frames, 16 million decoded samples per frame, and 48 million decoded samples in total; applications can configure lower limits. Destroying the viewer removes only that instance's file-manager entry, viewport, rendering engine, listeners, metadata, and image cache. Cornerstone owns the shared worker pool, so destroying a File Viewer instance never terminates a host-owned worker.

The local Part 10 path registers only the `dicomfile:` loader, not `wadors` or another DICOMweb loader, and performs no `fetch` or XHR after the file bytes are handed to the renderer. See `THIRD_PARTY_LICENSES.json` and `THIRD_PARTY_NOTICES.md` for the complete npm and native WebAssembly codec license closure.

This renderer is a preview aid, not a medical device or a diagnostic workstation.
