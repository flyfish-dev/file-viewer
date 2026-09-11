# Third-party notices

## web-ifc 0.0.77

`@file-viewer/assets-ifc` redistributes the browser ESM API and WebAssembly runtime files published by `web-ifc@0.0.77`.

- Project: web-ifc / That Open Company
- License: Mozilla Public License 2.0 (MPL-2.0)
- Redistributed files: `web-ifc-api.js`, `web-ifc.wasm`, `web-ifc-mt.wasm`
- Packaged license: `viewer/wasm/model/LICENSE.web-ifc-MPL-2.0.md`

The File Viewer wrapper code remains Apache-2.0. The MPL-2.0 terms continue to apply to the redistributed web-ifc files.

## @thatopen/fragments 3.4.7

The optional IFC capability uses `@thatopen/fragments@3.4.7` for its worker-backed large-model path and redistributes the matching module worker through `@file-viewer/assets-ifc` so deployments remain self-hosted.

- Project: Fragments / That Open Company
- License: MIT
- Redistributed file: `fragments-worker.mjs`
- Packaged notice: `viewer/wasm/model/LICENSE.thatopen-fragments-MIT.txt`

`@thatopen/components@3.4.8` is also an MIT-licensed runtime dependency of `@file-viewer/capability-ifc`. It is installed as a normal npm dependency rather than copied into this asset pack.
