# WordPerfect fixture provenance

`format-matrix.wpd` is a repository-authored signature and bounded-fallback contract fixture. It is not counted as genuine WordPerfect coverage.

The remaining fixtures were copied without modification from `xberg-io/test_documents` commit `26fed917cf3946a6d08b5b2e9912cf1f3670d684`. That corpus records the original producer path, upstream revision and per-file license in `wordperfect/PROVENANCE.md`; the same fields and exact SHA-256 values are pinned locally in `manifest.json`.

- `wp42.wp` comes from LibreOffice writerperfect test data under MPL-2.0.
- `wp50.wp`, `wp51.wp` and `wp6.wpd` come from Apache Tika test data under Apache-2.0.
- `corel_wp6.wpd` comes from the CC0 OPF format corpus and exercises tables, inline styles, a footer and a footnote.

The upstream corpus explicitly excludes unlicensed `libwpd-regression` documents. File Viewer follows that boundary: no unlicensed third-party or customer file is committed. `.wp5` and `.wp6` are accepted routing aliases for genuine WP5/WP6 payloads; no renamed alias file is counted as fixture evidence.
