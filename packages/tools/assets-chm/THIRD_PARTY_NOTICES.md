# Third-party notices

The File Viewer integration around the CHM parser is released under Apache-2.0. The Rust/WASM implementation is based only on permissively licensed source and format research from:

- RustChm, commit `5418439a40812079b479acec40719cddedcb583c`, MIT License, Copyright (c) 2026 yeroo.
- FastChm, commit `2c22935ba0a1fc7a5a3d3d9785c970058c4d00f0`, MIT License, Copyright (c) 2026 yeroo.

The retained upstream MIT notice and detailed file provenance are recorded in
`rust/NOTICE.md` in the renderer package and as `RUST_NOTICE.md` beside the
Worker/WASM files in redistributed `vendor/chm` bundles.

No CHMLib, libmspack, chmlib-ts, libchm 0.3.0 LZX port, or other LGPL-derived implementation is distributed by this package.
