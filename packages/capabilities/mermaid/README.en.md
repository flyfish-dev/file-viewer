# @file-viewer/capability-mermaid

Registers the Mermaid loader used by Mermaid code blocks in Markdown. The standard profile does not install this package.

The normal source build bundles Mermaid 12.1.0 and KaTeX 0.18.2. Drawing uses the same engine through `@file-viewer/capability-mermaid/engine`. Installing this candidate needs no dependency security overrides. `dist/bundled-runtime.json` records the actual input versions, lockfile and source hashes, license files, and output hashes. Complete third-party licenses are retained in `dist/THIRD_PARTY_LICENSES.txt`.

Building the source requires Node.js 22.12 or later for the Mermaid 12 build dependency. The published package provides the compiled browser engine, so applications do not install the raw Mermaid package.

Node20 consumer compatibility is checked by installing and building the browser entry with a separate Node20.20.2 runtime. Set `FILE_VIEWER_CONSUMER_NODE` and `FILE_VIEWER_CONSUMER_NPM_CLI` to its Node binary and npm CLI paths, then use the source-build Node runtime to run `node scripts/verify-packed-browser.mjs --node20-consumer`. Public CI runs both the ordinary Vite consumer and this independent consumer check.

Math labels use KaTeX MathML by default, without external styles or fonts. Diagrams with math labels use `foreignObject` after resource-policy checks and DOMPurify sanitization; ordinary diagrams retain SVG labels.

`pnpm --filter @file-viewer/capability-mermaid verify:packed-browser` verifies packed files and both dependency audits in an independent consumer with an empty cache and no security overrides. Chromium and WebKit check the actual Markdown and drawing diagrams, math labels, sequence participants with configuration objects, and offline requests. These checks describe the source candidate; published npm 3.1.2 still uses the older dependency graph.
