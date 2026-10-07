# Output compatibility regressions

`pnpm test:output-compatibility` executes deterministic layout, rotation and
readiness tests. `pnpm verify:output-compatibility` additionally launches Chromium
and exercises the actual DOCX/PDF engines, print-to-PDF, thumbnails and OpenJPEG.
Build core, DOC, Word and PDF first and install Chromium with Playwright.

The fixture generator creates minimal DOCX sections, PDF rotation/color markers,
and a tiny lossless JPEG2000 image. No source fonts or user document contents are
included. Tests save screenshots, measured paper sizes and machine-readable
results to `output/output-compatibility`.

`--dom-browser` is a limited mode for environments without local HTTP navigation;
it excludes real PDF.js/Worker tests and is labeled as such in the result. A full
run serves only its own test bundle and staged PDF runtime through loopback HTTP.
Use `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` only to select an already installed
Chromium executable. This suite is not the full workspace release gate.
