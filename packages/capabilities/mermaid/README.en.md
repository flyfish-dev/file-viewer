# @file-viewer/capability-mermaid

Registers the Mermaid loader used by Mermaid code blocks in Markdown. The standard profile does not install this package.

The normal source build bundles Mermaid 11.17.2 and KaTeX 0.18.2. Drawing uses the same engine through `@file-viewer/capability-mermaid/engine`. Installing this candidate needs no dependency security overrides. `dist/bundled-runtime.json` records the actual input versions, lockfile and source hashes, license files, and output hashes. Complete third-party licenses are retained in `dist/THIRD_PARTY_LICENSES.txt`.

Math labels use KaTeX MathML by default, without external styles or fonts. Diagrams with math labels use `foreignObject` after resource-policy checks and DOMPurify sanitization; ordinary diagrams retain SVG labels.

`pnpm --filter @file-viewer/capability-mermaid verify:packed-browser` verifies packed files and both dependency audits in an independent consumer with an empty cache and no security overrides. Chromium and WebKit check the actual Markdown and drawing diagrams, math labels, and offline requests. The macOS checks have passed; Public CI checks Linux. These results describe the source candidate; published npm 3.1.2 still uses the older dependency graph.
