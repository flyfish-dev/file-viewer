# @file-viewer/renderer-chm

Browser-native CHM reader for File Viewer. A dedicated Rust/WASM Worker parses the ITSF/ITSP directory and LZX content locally; the source file is never uploaded.

The reader provides contents, keyword index, text search, internal navigation, and lazy resource loading. Topic HTML always runs in a script-free sandbox, with a CSP that blocks ActiveX, scripts, forms, plugins, and network resources.

Default self-hosted asset paths:

- `vendor/chm/chm.worker.js`
- `vendor/chm/chm_wasm.js`
- `vendor/chm/chm_wasm_bg.wasm`

Private deployments can override them with `options.chm.workerUrl`, `options.chm.wasmModuleUrl`, and `options.chm.wasmUrl`.
