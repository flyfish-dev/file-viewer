# @file-viewer/renderer-dicom

An explicitly installed DICOM renderer for local DICOM Part 10 files. It uses the modular Cornerstone3D core and DICOM image-loader packages; it does not embed the OHIF application and does not use DCMTK.

This package is intentionally excluded from File Viewer full and preset packages. Applications that need medical imaging install and register it explicitly:

```ts
import { createViewer } from '@file-viewer/core'
import { dicomRenderer } from '@file-viewer/renderer-dicom'

const viewer = createViewer(container, {
  rendererMode: 'replace',
  renderers: [dicomRenderer],
})
```

The first scope accepts Implicit/Explicit VR Little Endian, JPEG Lossless Process 14 SV1, JPEG-LS Lossless, and JPEG 2000 Lossless Part 10 files covered by Chromium, Firefox, and WebKit regression (single-frame or multi-frame). It provides stack navigation, window width/center, zoom, pan, left/right 90° rotation, fit-to-view, and unified File Viewer view-state restoration. Other transfer syntaxes, PACS/DICOMweb, multi-file series assembly, annotations, MPR, segmentation, hanging protocols, and diagnostic use are outside this package.

The package initializes codec workers only after a DICOM file is selected. Defaults are limited to a 64 MiB source, 256 frames, 16 million decoded samples per frame, and 48 million decoded samples in total; applications can configure lower limits. Destroying the viewer removes only that instance's file-manager entry, viewport, rendering engine, listeners, metadata, and image cache. Cornerstone owns the shared worker pool, so destroying a File Viewer instance never terminates a host-owned worker.

The local Part 10 path registers only the `dicomfile:` loader, not `wadors` or another DICOMweb loader, and performs no `fetch` or XHR after the file bytes are handed to the renderer. See `THIRD_PARTY_LICENSES.json` and `THIRD_PARTY_NOTICES.md` for the complete npm and native WebAssembly codec license closure.

This renderer is a preview aid, not a medical device or a diagnostic workstation.
