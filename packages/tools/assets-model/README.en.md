# @file-viewer/assets-model

Self-hosted OCCT Worker/WebAssembly assets for `@file-viewer/renderer-3d` STEP / STP, IGES / IGS, and BREP preview.

The capability pack stages the OCCT worker, `occt-import-js` runtime/WASM, and matching license notices under `wasm/model/`. It is suitable for offline, intranet, and restrictive-network deployments and does not require a runtime CDN.

IFC/BIM is intentionally separate. Install `@file-viewer/capability-ifc` together with `@file-viewer/assets-ifc` only when `.ifc` preview is required. This keeps the MPL-2.0 `web-ifc` runtime out of the normal 3D/model asset closure.
