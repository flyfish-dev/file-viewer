# Automatic wrapped-row height regression

`original-454.xlsx` is the exact output of the original issue #454 inline JSZip generator, retained as `author-generator.cjs`. SHA256: `0e89f2a678067fb3d0e8705b27080859a18c1294d7964ec0161259ba03b11cad`. It contains synthetic text only.

`node test/generate-spreadsheet-auto-height.mjs` creates derived explicit/custom/hidden/merged/font/virtual-window and DrawingML anchor controls without modifying the original. The native Excel reference opened the original directly without AutoFit and displayed all content. The browser acceptance is measured text containment under its actual fonts/column width, not hardcoded native row heights.

Build core and Spreadsheet, serve this fixture under `/preview/` in an isolated packed consumer, then set `SPREADSHEET_AUTO_HEIGHT_BASE_URL` to its index URL and run `node test/spreadsheet-auto-row-height.browser.mjs`. It uses Chromium and desktop WebKit, main-thread and actual packaged Worker, including real header/row dragging. This is not iOS Safari proof.
