# Hangul fixture provenance

`format-matrix.hwp` and `format-matrix.hwpx` are repository-authored parser-contract fixtures. They contain synthetic text and generated binary/XML structures only.

The `hwplib-*.hwp` files and `LICENSE.hwplib.txt` were copied from the public `neolord0/hwplib` regression corpus at commit `d9e073d6899d947f8f583492e00a5e1062381d7e`. The upstream project and these files are distributed under Apache License 2.0. Exact file and license hashes are pinned in `manifest.json` so a fixture cannot be silently replaced.

These real HWP v5 fixtures cover table records, embedded image data, and a larger paragraph/body-record corpus. They are parser evidence, not a claim that page layout, headers, footers, or every producer variant is already rendered with high fidelity.

The `hwpxlib-*.hwpx` files were copied without modification from the public `neolord0/hwpxlib` regression corpus at commit `96ff157eb5973ba1bcf96c00c1b0993d61a718a0`. The repository and its test files are Apache-2.0; the license text is byte-identical to `LICENSE.hwplib.txt`. These fixtures cover real HWPX page dimensions and margins, styled text, multiple columns, merged table cells, header/footer controls, and embedded image data. Exact upstream paths and SHA-256 values are pinned in `manifest.json`.

The HWP/HWPX stable claim is deliberately `structured`: static text, inline styles, tables, page geometry, headers/footers and images are covered. Charts, OLE objects and advanced drawing effects remain documented limitations and are not presented as high-fidelity support.
