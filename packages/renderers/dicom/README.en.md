# @file-viewer/renderer-dicom

An explicitly installed DICOM renderer for local DICOM Part 10 files. It uses the modular Cornerstone3D core and DICOM image-loader packages; it does not embed the OHIF application and does not use DCMTK.

This package is intentionally excluded from File Viewer full and preset packages. The CLI `--profile full` separately adds DICOM and signature capabilities. Both CLI and manual DICOM installations need the application policy below.

## Application installation policy

`@file-viewer/renderer-dicom@3.1.2` uses Cornerstone 5.8.2. Its default dependency graph still resolves affected transitive dependencies. The repository's workspace overrides are not inherited by applications installing the published package, and the CLI does not add this policy automatically.

For npm, merge these scoped overrides into the consuming application's root `package.json` before installing:

```json
{
  "overrides": {
    "dcmjs": {
      "adm-zip": "0.6.1"
    },
    "@cornerstonejs/dicom-image-loader": {
      "uuid": "11.1.1"
    },
    "@kitware/vtk.js": {
      "fflate": "0.7.5"
    }
  }
}
```

```bash
npm install @file-viewer/renderer-dicom
npm ls adm-zip uuid fflate
npm audit
npm audit --omit=dev
```

Keep the updated application lockfile. Other package managers need equivalent application/workspace-root overrides and verification of the resolved versions. Adding these leaf packages as direct dependencies does not replace their parents' exact pins.

Fresh npm consumer checks on 2026-10-08 used core and renderer artifacts packed from the current source tree; they did not audit the registry tarballs. The default graph of those artifacts had 10 affected package entries (7 high, 3 moderate) in both full and production audits. A separate consumer of those artifacts with the three overrides above had zero findings in both audits. That result applies to the overridden graph and the advisory data at that time; it does not make the published package's default graph clean.

Installation and build tooling must satisfy the current transitive dependency `dcmjs@0.52.0`'s existing Node.js `>=22.13` requirement. These checks used Node.js 24.20.0 and npm 11.9.0.

Applications must qualify their resolved dependency graph, bundler, browser targets, and required DICOM transfer syntaxes before deployment. The audit checks above did not run a browser gate. Regular DICOM CI runs Node inspection; the separate repository command `pnpm --filter @file-viewer/renderer-dicom verify:packed-browser` tests a packed consumer with this application policy and must be run separately to establish that coverage.

## Registration

Applications that need medical imaging install and register this renderer explicitly:

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

The local Part 10 path registers only the `dicomfile:` loader, not `wadors` or another DICOMweb loader, and performs no `fetch` or XHR after the file bytes are handed to the renderer. `THIRD_PARTY_LICENSES.json` and `THIRD_PARTY_NOTICES.md` record the repository's workspace-resolved npm dependency/license snapshot and native WebAssembly codec licenses. Review the application's actual resolved closure as it may differ from that snapshot.

This renderer is a preview aid, not a medical device or a diagnostic workstation.
