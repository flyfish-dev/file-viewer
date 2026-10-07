# Compatibility regression gate

Run `pnpm test:compatibility` for parser/model/DOM contracts and
`pnpm verify:compatibility-browser` for those contracts plus real Chromium
rendering. Install Chromium with `pnpm exec playwright install chromium`; a local
installation may be selected using `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.

The gate resolves declared dependencies from their owning packages. It does not
use parser, chart-library or DOCX-layout replacements. PDF hand-tool checks use
the actual interaction controller on a scrollable test viewport, not a complete
PDF.js document load.

`fixtures.mjs` generates original minimal OOXML packages and a DOC table model.
The table model tests the renderer contract rather than binary parsing. No
external documents or fonts are needed. The browser gate writes screenshots and
`report.json` under `output/compatibility-review`, which is excluded from Git.
