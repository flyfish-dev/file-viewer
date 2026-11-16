# Spreadsheet comment fixtures

These small workbooks are generated from synthetic data by `python3 test/fixtures/spreadsheet-comments/generate.py`, using only Python's standard library. ZIP timestamps are fixed so regeneration is deterministic. They contain no customer documents, real identities or external resources and are covered by the repository's Apache-2.0 license.

- `excel-comments.xlsx`: traditional notes, a merged-header note, an annotated blank cell, a note at D650, threaded replies, a resolved thread, authors, timestamps and Japanese text.
- `excel-comments-text.xlsx`: escaped OOXML text and phonetic runs that must not enter the note body.
- `excel-comments-partial.xlsx`: one missing threaded-comment part; valid comments from other sheets must survive.
- `excel-comments-parents.xlsx`: malformed cross-cell parent chains that must not attach replies to the wrong cell or require quadratic traversal.

The browser fixture uses the source renderer and the same locally bundled Worker as a consumer. With the core and spreadsheet packages built:

```sh
pnpm --filter @file-viewer/core build
pnpm --filter @file-viewer/renderer-spreadsheet build
pnpm --filter @flyfish-group/file-viewer-demo exec vite --config ../../test/spreadsheet-comments.vite.config.mjs
node test/spreadsheet-comments.browser.mjs
```

The fixture defaults to a real Worker. `?worker=false` runs the same workbook through the main-thread parser. `?theme=dark` and `?locale=ja-JP` exercise renderer theme and translated messages. Browser checks reject non-local requests, verify the Worker response, exercise pointer/keyboard navigation and capture standalone screenshots without host application UI. `CHROME_PATH` can select an installed Chromium binary.

`preview.png` and `mobile-preview.png` are recorded review evidence from the standalone File Viewer shell with this generated workbook, not golden-image assertions. Fresh browser captures and machine-readable results are written to the ignored `artifacts/spreadsheet-comments/` directory.
