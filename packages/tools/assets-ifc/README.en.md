# @file-viewer/assets-ifc

Self-hosted runtime assets for the explicit `@file-viewer/capability-ifc` integration. The package pins `web-ifc@0.0.77` and the matching `@thatopen/fragments@3.4.7` worker used by the optional large-model backend.

The staged payload contains:

```text
wasm/model/web-ifc-api.js
wasm/model/web-ifc.wasm
wasm/model/web-ifc-mt.wasm
wasm/model/fragments-worker.mjs
wasm/model/LICENSE.web-ifc-MPL-2.0.md
wasm/model/LICENSE.thatopen-fragments-MIT.txt
```

Use the package installer or File Viewer CLI to copy the staged files into the application's `public/file-viewer` asset root. The install is transactional and records a per-file SHA-256 receipt through `@file-viewer/asset-installer`.

The normal 3D renderer, Engineering preset, and Full baseline do not install this pack automatically. It is part of the explicit IFC capability closure only.

`web-ifc` is MPL-2.0. `@thatopen/fragments` is MIT-licensed. Preserve the staged license/notice files when redistributing their runtime files. No public CDN is used by either IFC backend.
