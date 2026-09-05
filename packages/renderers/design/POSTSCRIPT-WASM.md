# EPS/PostScript WebAssembly build

The browser engine is built from Stet commit `3aaf0a76ebd0f9129a715dfa10614d8871d8e965` (workspace version 0.7.0; `stet-wasm` 0.2.0). It is a pragmatic, experimental renderer, not a claim of Adobe PostScript Level 3 conformance.

## Redistribution boundary

The published WebAssembly does **not** contain Stet's upstream URW Base35 Type 1/CFF resources or Ghostscript `default_cmyk.icc`. The build patch removes every compiled reference to those assets, substitutes SIL OFL 1.1 fonts, and uses Stet's formula-based PLRM DeviceCMYK fallback. The reproducible build also deletes the disallowed upstream files from its temporary checkout before compiling and scans the optimized binary for their known markers.

Substitutions are Carlito for Helvetica-compatible faces, Tinos for Times-compatible faces, Cousine for Courier-compatible faces, and Noto Sans Symbols 2 for symbol coverage. Font metrics and color-managed output can therefore differ from Adobe applications.

## Rebuild

Required tools are pinned and checked by the script:

- Rust/Cargo 1.88.0 with `wasm32-unknown-unknown`
- wasm-bindgen CLI 0.2.127
- Binaryen wasm-opt 130

Run from the repository root:

```sh
node packages/renderers/design/scripts/build-postscript-wasm.mjs
pnpm --filter @file-viewer/renderer-design build
node scripts/verify-postscript-wasm.mjs
```

The script downloads every font from a pinned Google Fonts commit, verifies its SHA-256, applies `source/postscript/stet-safe-browser.patch`, uses the checked-in `source/postscript/Cargo.lock` (SHA-256 `3cf3dd7681dda9a172fc8b11ca64759f315c88292446708398b11c91ec0c07a1`), builds with Cargo's locked dependency graph, and replaces only the generated glue and WASM runtime in this package. Cargo runs with fixed locale/time settings, incremental compilation disabled, one codegen unit, and path-prefix remapping for both the temporary checkout and the local toolchain home. The output scan rejects leaked local build paths so two clean runs can be compared byte-for-byte.

## Runtime safety boundary

Stet receives a bounded virtual-machine allocation. File size, page count, source dimensions, output dimensions, output pixels, render DPI, decoded print bytes, and retained canvas bytes are capped. Because `std::time::Instant` is not implemented for this wasm32 target, wall-clock cancellation is enforced outside the interpreter: every operation runs in a dedicated Worker that the client terminates on timeout or abort. This prevents a non-terminating PostScript program from blocking the browser UI; it does not make arbitrary PostScript trusted input.
