# libwpd WebAssembly provenance

The WordPerfect Worker builds the following sources under their documented license arms:

- `libwpd-0.10.3.tar.gz` — checksum-pinned, pruned source archive derived from upstream `libwpd` 0.10.3 by Xberg (public headers, implementation sources and license files retained), MPL-2.0 OR LGPL-2.1-or-later; this build selects MPL-2.0. SHA-256 `ca3575282acff8c952c12160433ad7e73e803ff3f070b8442c7ffa1f3a19f9ae`.
- `librevenge-0.0.6.tar.gz` — checksum-pinned, pruned source archive derived from upstream `librevenge` 0.0.6 by Xberg (public headers, implementation sources and license files retained), MPL-2.0 OR LGPL-2.1-or-later; this build selects MPL-2.0. SHA-256 `686cc36be3196a0a808761cfd3951a46ff809cb0e028b0902c787261a1389d0f`.
- `boost-subset.tar.gz` — the header-only Boost 1.90 dependency closure generated with `bcp`, BSL-1.0. SHA-256 `802ee17c5e380efbcbb696468ee3c7090aa409db89c2063b4c9b8d3e3aff1e08`.
- `shim.cpp` — the callback-to-structured-event bridge derived from `xberg-libwpd`, MIT. Its license is included as `LICENSE.xberg-shim-MIT.txt`.

The source archives are checksum-verified by `scripts/build-libwpd-wasm.mjs` before each build. The generated `dist/libwpd.mjs` and `dist/libwpd.wasm` are lazy-loaded only by the WordPerfect Worker. Current generated SHA-256 values are `be29b0bac887007ca9adc012c3122bb84964de2dd11d9500e8e9b03feb8939f2` (`libwpd.mjs`) and `51db45b3bec05b72b2f6ff82c5ed3e715916e61a7a2f153df0644e10d75e6b8c` (`libwpd.wasm`).

Sources:

- https://downloads.sourceforge.net/project/libwpd/libwpd/libwpd-0.10.3/libwpd-0.10.3.tar.gz
- https://downloads.sourceforge.net/project/libwpd/librevenge/librevenge-0.0.6/librevenge-0.0.6.tar.gz
- https://github.com/xberg-io/xberg/tree/main/crates/xberg-libwpd
