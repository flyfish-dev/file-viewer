# @file-viewer/renderer-wordperfect

Independent WordPerfect `.wpd/.wp/.wp5/.wp6` renderer. Files are routed by the `FF 57 50 43` content signature and macros are never executed. Its Worker lazily loads a WebAssembly build of `libwpd 0.10.3` and `librevenge 0.0.6` under MPL-2.0 to recover paragraphs, headings, lists, inline styles, tables, headers, footers, and notes. A bounded text preview is used only when WASM is unavailable.

See `vendor/libwpd-src/PROVENANCE.md` for source attribution, checksums, and the reproducible build command. Licensed genuine WP 4.2, 5.0, 5.1, and 6.x fixtures pass parser assertions and Chromium, Firefox, and WebKit smoke, so the public catalog classifies this renderer as `structured / stable`. `.wp5/.wp6` remain content-signature routing aliases; renamed files do not count as fixture evidence.
