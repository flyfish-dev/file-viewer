# Third-party notices

- `libwpd` 0.10.3 and `librevenge` 0.0.6 are compiled to WebAssembly under their MPL-2.0 license arm. Their checksum-pinned source archives and reproducible build instructions ship in `vendor/libwpd-src/`.
- The callback bridge is derived from the MIT-licensed `xberg-libwpd` shim. Its license is included verbatim in `vendor/libwpd-src/LICENSE.xberg-shim-MIT.txt`.
- A header-only Boost 1.90 subset is present at build time under BSL-1.0. It is checksum-pinned and described in `vendor/libwpd-src/PROVENANCE.md`.

The WebAssembly runtime is lazy-loaded by the WordPerfect Worker. The bounded TypeScript signature/text fallback remains separate and is not presented as equivalent fidelity.
