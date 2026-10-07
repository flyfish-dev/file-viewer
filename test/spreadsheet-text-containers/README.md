# Legacy spreadsheet text containers

Build Core and the Spreadsheet renderer, then run:

```sh
node packages/renderers/spreadsheet/scripts/verify-text-containers.mjs
```

Install Playwright Chromium or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.
The suite uses the actual workbook parser, renderer search provider and the
self-contained classic Worker bundle. It checks UTF-8, UTF-16, GBK, HTML,
binary signature guards and a probe ending within a multibyte character.
It neither mocks workbook parsing nor substitutes successful main-thread
fallback for a Worker result. Evidence contains generated text only.
