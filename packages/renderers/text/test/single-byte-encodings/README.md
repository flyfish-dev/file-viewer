# Single-byte encoding browser regression gate

Run `pnpm test:text-single-byte-encodings` from the workspace root. It first runs
the core encoding and public type-contract Vitest suites, then this harness in
Chromium and WebKit. Root `pnpm test` includes the gate, and Public CI already
installs both engines. No additional dependency or lockfile update is needed.

The harness bundles the checkout's source core and actual renderers, including
DOMPurify, Marked, highlight.js, and diff2html. It blocks network requests and
checks rendered DOM, sandboxed HTML preview/source toggles, XML parsing, source
byte preservation, and teardown. It does not mock the DOM or decoding pipeline.

For each of ISO-8859-1, ISO-8859-2, ISO-8859-15, Windows-1250, Windows-1251, and
Windows-1252 it verifies:

- Explicit encoding and automatic fallback in code, Markdown, HTML, XML, patch,
  large-text rendering, and LRC lyrics (annotated, lyrics-only, and exact source).
- All 64 bytes from 0x80 through 0xBF at the starts of consecutive 1024-byte line
  segments, with exact text reconstruction and first/previous/next/last controls.
- Exactly 200 matches across multiple 256 KiB search chunks, exact source byte
  offsets and line numbers, every next-match navigation, visible highlighted
  content in the correct segment, wraparound, previous-match navigation, and clear.
- A query spanning a search-chunk boundary is found exactly once.

Compatibility controls cover default/explicit GB18030, valid UTF-8, UTF-8 BOM,
and BOM-marked or inferred UTF-16LE/BE. UTF-16 must stay on the regular renderer.
An explicit Windows-1252 control decodes ambiguous valid UTF-8 bytes as requested.
ISO-8859-1 samples include C1 bytes with their WHATWG Windows-1252 interpretation.
Character-set samples use authored byte/Unicode pairs; segmentation uses native
decoding of the full unsliced buffer as its boundary-independent oracle.

Browser runs save a JSON report in `output/text-single-byte-encodings` with the
checkout commit, bundle hash, browser versions, checks and failures, plus
per-engine rendered screenshots and failure screenshots. Set
`TEXT_ENCODING_ARTIFACTS` to override the directory. Public CI retains these files
in its existing `intermediate-renderer-browser-evidence` artifact.

For an environment where browser execution is prohibited, these commands only
validate syntax and static fixtures and must not be reported as a browser pass:

```sh
node --check packages/renderers/text/test/single-byte-encodings.browser.mjs
node --check packages/renderers/text/test/single-byte-encodings/browser-entry.mjs
node --check packages/renderers/text/test/single-byte-encodings/fixtures.mjs
node packages/renderers/text/test/single-byte-encodings.browser.mjs --check-fixtures
node packages/renderers/text/test/single-byte-encodings.browser.mjs --check-bundle
```

`--check-bundle` additionally compiles the exact browser entry without importing
Playwright, launching a browser, or writing a browser result report.
