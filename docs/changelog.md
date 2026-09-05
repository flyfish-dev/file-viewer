# Changelog

<div class="doc-kicker">Release history</div>

<p class="doc-lead">
  The notable user-facing changes shipped from the current File Viewer mainline. GitHub Releases remains the source for downloadable artifacts and immutable release notes.
</p>

## v3.0.2 — Corrected patch release for spreadsheet search, DOCX shapes, and CAD monochrome output

This release supersedes 3.0.1. npm does not allow replacing packages that already have dependents, so the published 3.0.1 line cannot be completely retracted; affected 3.0.1 packages are deprecated after 3.0.2 is published.

### Issue fixes and regression coverage

- Fixed #247: spreadsheet search now searches parsed workbook cells outside the current virtual window, loads the target window, and jumps to the matching cell. The real `apps/viewer-demo/public/example/excel.xls` sample passes the browser regression.
- Fixed #250 by upgrading `@file-viewer/docx` to `0.3.29`, which corrects page-relative positioning for floating shapes. The reporter's `test.docx` was rendered locally with the shape content in the expected positions.
- Completed #213/#245: the CAD monochrome policy is preserved from DWF through the CAD renderer and HTML/Print output without mutating source data. The real DWF regression passes.
- Re-ran the #242 Vite/PDF CJK asset boundary, the #232 `postal-mime@3.0.0` EML parser cases, and the Vue 2.6 CLI 3 Office sample. Vue 2 remains in the release gate.

### Safe dependency updates

- Adopted the safe Dependabot subset: `pako@2.2.0`, `proj4@2.22.0`, `vite-plugin-dts@5.1.0`, `cnfast@0.2.0`, and `prettier@3.9.6`.
- pako 3 remains deferred because DICOM `Inflate` error/message semantics are consumed by `packages/renderers/dicom/src/inspect.ts`. Next 16.3.4 remains excluded because its `sharp-libvips` dependency fails the repository's LGPL license gate.

### Release composition

The frozen release contains 88 npm targets from one commit: 87 mainline packages at `3.0.2` and the historical `msdoc-viewer` alias at `0.2.5`. External engines remain `@file-viewer/docx@0.3.29` and `styled-exceljs@0.21.4`.

## v3.0.1 — Host peer frameworks, PDF CJK fallback, and EML header correctness

### Readable text previews

- Added opt-in readable text previews (#235): logical-line wrapping works in regular and bounded virtual views, while structured files can use lazily loaded Prettier parser chunks with an explicit formatted-preview badge and original-source switch. The formatting byte limit is independent from large-text rendering, and original download bytes remain authoritative.

### CLI reliability and interaction

- Replaced free-form format/capability entry in the interactive create/add wizard with checkbox-style renderer and format-family rows. Capabilities included by the selected profile are visibly preselected and retained, while optional rows support individual numbers, ranges, select-all, and clear-extra commands.
- Generated Vite 8 projects now declare and preflight Node `^20.19.0 || >=22.12.0` before `dev` or `build`, producing an actionable upgrade message on unsupported runtimes. Web Component events are created from the element's owning document realm with a compatibility fallback when global `CustomEvent` is unavailable.

### New format renderers

- Added `@file-viewer/renderer-chm`: offline in-browser CHM help reading with a Rust/WASM unpacker and a sandboxed reader for table of contents, articles, and images. Nothing leaves the browser.
- Added `@file-viewer/renderer-design`: offline Adobe design preview covering PSD/PSB layers, Illustrator native PGF and PDF-compatible surfaces, IDML/ICML/INX, INDD/XD, modern XFL animation, and swatch, brush, and resource files. It ships as an explicit opt-in package whose Worker, WASM, and font assets can be self-hosted.

### PDF

- Fixed the 3.0 packaging failure reported in #242 (Vite 8 + pnpm 11 + Node 22): `@file-viewer/vite-plugin` has treated pdf assets as required since 2.4, and 2.4 passed because `@fontsource-variable/noto-sans-sc` was then a runtime dependency of `@file-viewer/renderer-pdf`. 3.0.0 moved that font to devDependencies, so an installed app had no font source to copy and the missing required asset aborted `vite build`, which made rolling back to 2.4 look like the fix. In 3.0.1 the presets that activate the pdf renderer own the font source (`preset-office` and `preset-all` declare the font package, `preset-standard` takes it from `@file-viewer/assets-standard`), the published `@file-viewer/renderer-pdf` tarball carries no font copy, and when no font source resolves the asset is optional, so the build logs a warning instead of failing and PDF rendering keeps relying on the fonts embedded in each document. The #242 and profile gates keep that ownership and optionality from drifting back.

### Email

- Raised the EML parsing baseline to postal-mime `3.0.0` (#232): parts without a declared charset fall back to the header encoding, folded RFC 5322 headers unfold completely, repeated headers resolve first-wins, and `to`/`cc`/`bcc` keep their original order.

### Ecosystem package installation

- `@file-viewer/vue3` no longer installs the host framework: `vue` moved to `peerDependencies: ">=3.3 <4"`, matching the Vue 2.6, Vue 2.7, React, React Legacy, Svelte, and jQuery packages, and the build-time icon library moved to devDependencies so the only runtime dependency is `@file-viewer/core`. Applications pinned to a Vue version outside the old `^3.5.35` range previously received a second Vue copy and crashed on mount with `Cannot read properties of null (reading 'refs')`.
- Added a host runtime contract gate: ecosystem components may only install File Viewer packages at runtime, must declare their host framework as a peer, and must keep the three Vue release lines disjoint. A cold-install check now compares resolved host framework paths immediately after install and fails with the duplicated copies listed instead of surfacing as a browser timeout.
- The `msdoc-viewer` compatibility alias moved to `0.2.5` so it follows the 3.0.1 `@file-viewer/doc` line: the alias ships the Word renderer version it resolves to, and a frozen alias could no longer be published twice. This release freezes 88 npm targets: 87 mainline packages on `3.0.1` and the `msdoc-viewer` alias on `0.2.5`.

### Dependency security

- The XMind parsing path no longer resolves `@xmldom/xmldom` 0.9.10, whose six advisories are reachable from `DOMParser.parseFromString` while previewing an untrusted file; a dependency override keeps the whole graph on 0.9.12, and the public boundary check verifies the override really lands (#246).

## v3.0.0 — Modular CLI, opt-in specialist formats, and security gates

Released August 27, 2026.

- Added `@file-viewer/cli`, `file-viewer-cli`, and `create-file-viewer` for new projects and existing `package.json` applications. It detects frameworks and build systems, selects framework versions, formats, presets, and assets, and supports npm, pnpm, Yarn, Bun, credential-free private registries, and integrity-checked offline tgz preparation.
- Made `standard` the recommended common-format profile without changing the eight published Full contracts. Existing `*-full` packages keep their `preset-all` format matrix, APIs, and same-version offline assets. Explicit CLI `full` selection adds later specialist capabilities after showing their size, runtime, and license boundaries.
- Kept DICOM and digital-signature containers out of unchanged Full dependencies. The optional DICOM renderer covers bounded local single-file, single-frame, and multi-frame preview for uncompressed, JPEG Lossless, JPEG-LS, and JPEG 2000 Lossless fixtures; it is not a diagnostic, PACS/DICOMweb, or multi-file-series viewer (#210).
- Added an optional signature and evidence-container renderer for bounded CMS/CAdES, RFC 3161/5544, ASiC-S/E, RFC 4998, JWS, and public OpenPGP material. It uses a permissively licensed rPGP Worker/WASM path, contains no LGPL source, and reports parsing, digest/signature checks, trust, and legal validity as separate concepts (#206).
- Fixed the reporter's five-slide PPTX layout sample, including DrawingML table bounds and insets, horizontal SmartArt text, complex shape geometry, and the PPTX Worker in Chromium, Firefox, and WebKit (#200).
- Restored the reporter's Excel table theme, header, and alternating-row styles, and kept resized column widths across sheet switches. Invalid merge metadata and stable Office width handling received matching regressions (#211/#203).
- Added nested email-attachment preview across React, React Full, React Legacy, and React Legacy Full, with malicious filename, buffer replacement, unmount, Worker, and Object URL cleanup coverage (#212).
- Re-ran the #178 Office 365/WPS in-cell image, floating drawing, TIFF, Worker transfer, double-click lightbox, and optional column-resizing suite.
- Hardened document-generated HTML/DOM boundaries for DOC, RTF, PPTX, Markdown, Mermaid, Drawing, PlantUML, and Typst. External links remain blocked by default; CSP and Trusted Types gates pass in Chromium, Firefox, and WebKit.
- Froze 84 npm targets: 83 mainline packages use 3.0.0, while the historical `msdoc-viewer` compatibility package uses 0.2.4. The external maintained engines are pinned to `@file-viewer/docx@0.3.28` and `styled-exceljs@0.21.4`.
- The release promotes only the exact tarballs produced by the frozen commit after builds, tests, security gates, cold installs, browser matrices, and `npm publish --dry-run`. Publishing does not rebuild or invent another stable version.

## v2.4.0 — Unified versions and frozen release candidates

Released August 25, 2026.

- Unified the root, GitHub Release, and 56 regular npm packages at 2.4.0. The historical `msdoc-viewer` compatibility package uses 0.2.3.
- Updated the Spreadsheet and iWork paths to `styled-exceljs@0.21.3`, including prototype-safe worksheet maps, bounded XML/tag handling, and safe serialization of document-provided HTML, CSS, links, images, and attributes.
- Re-ran the #178 Office 365/WPS in-cell image, floating drawing, TIFF, Worker transfer, double-click lightbox, and optional column-resizing regressions. Version unification does not remove Excel column resizing.
- Stable publishing now promotes the exact tarballs that passed the full build, cold-install, and npm dry-run rehearsal. A receipt pins the source commit, package set, byte sizes, and SHA-512 hashes; the publish command never rebuilds them.

## v2.3.2 — Multipage TIFF and Vite 8 chunking

Released August 24, 2026.

- Added a TIFF-only lazy UTIF.js path for CCITT Group 4 and bounded multipage rendering, with shared zoom, rotation, fit width, page state, and double-click or keyboard lightbox access (#208).
- Limited encoded bytes, page count, dimensions, per-page pixels, and cumulative decoded pixels; progressive page conversion releases RGBA data and Object URLs without changing native PNG/JPEG/WEBP loading.
- Switched Vite 8 projects to Rolldown `codeSplitting.groups` while retaining Rollup `manualChunks` on Vite 5–7 and preserving user groups, priorities, array outputs, and disabled code splitting (#209).
- Re-ran the original #178 Office 365/WPS in-cell-image workbook through main-thread, Worker, TIFF drawing, and lightbox paths without removing Excel column resizing.
- Published `@file-viewer/renderer-image@2.3.1`, `@file-viewer/vite-plugin@2.3.3`, `@file-viewer/preset-lite@2.3.1`, and the unified 2.3.6 All/Full/copy-assets line. This release includes every v2.3.1 security correction.

## v2.3.1 — Legacy DOC rendering security

Released August 24, 2026.

- Encoded document-provided font names and generated attributes in the legacy DOC HTML API.
- Blocked external DOC links by default. Internal bookmarks remain available; explicit opt-in permits only HTTP(S), email, telephone, and safe relative links.
- Sanitized DOC markup again at the mount boundary with DOMPurify 3.4.13 and inserted renderer CSS through `textContent`.
- Kept the sanitizer in the DOC lazy path. Its minified gzip size is 10,923 bytes and a 15 KiB release gate prevents unbounded growth.
- Published `@file-viewer/doc@2.3.1`, `msdoc-viewer@0.2.2`, `@file-viewer/renderer-word@2.3.2`, and the 2.3.4 Office/Full/copy-assets patch line.

## v2.3.0 — Office/iWork coverage and verified file fixes

Released August 20, 2026.

- Added stable Pages, Numbers, Keynote, WordPerfect, Hangul, DBF, FB2, XLA/XLAM, and POT routes to the generated 221-extension, 32-pipeline matrix.
- Fully released the fixes tracked by #174, #178, #179, #195, #198, and #201-#204. #200 remains open because the original PPTX is still missing.
- Fixed Excel Office 365 and WPS in-cell images, workbook drawings, saved column widths, Shadow DOM column resizing, and double-click image preview. A reporter-provided TIFF drawing is now decoded on demand in the browser across main-thread, Worker, and lightbox paths.
- Updated the DOCX engine to `@file-viewer/docx@0.3.27` for complex frames, sections, positioned pages, and anchored content; the Worker cache key now matches the runtime.
- Hardened PPTX Worker output, rendered Markdown, archive filename decoding, package dependencies, and offline Worker/WASM delivery.
- Kept PPT-only CJK fonts and native WASM out of PPTX-only builds, and made Vite 5–8 resolve the `renderer-presentation/pptx` export subpath correctly (#205).
- The source and GitHub release are v2.3.0. Immutable npm corrections use `@file-viewer/renderer-spreadsheet@2.3.2`, `@file-viewer/renderer-iwork@2.3.1`, `@file-viewer/renderer-word@2.3.1`, `@file-viewer/renderer-presentation@2.3.1`, `@file-viewer/vite-plugin@2.3.2`, and the 2.3.3 Office/Full/copy-assets line. TIFF drawing metadata is supplied by `styled-exceljs@0.21.2`.

## v2.2.9 — PPTX and Markdown rendering security

The npm packages were published August 13, 2026; the GitHub Release was finalized August 17, 2026.

- Sanitized PPTX Worker HTML, SVG, inline styles, URLs, event attributes, scripts, and unsafe global CSS before they enter the preview DOM.
- Sanitized Marked output with DOMPurify and hardened links opened in a new window with `noopener noreferrer`.
- Added browser gates for malicious Markdown, synthetic PPTX Worker output, and real malicious PPTX files across normal and virtualized rendering paths.
- Kept the published capability matrix at 54 npm targets, 208 extensions, and 25 preview pipelines.

## v2.2.8 — Large spreadsheets, OFD first paint, and PPT watermark polish

Released August 11, 2026.

- Bounded spreadsheet auto-width sampling so large workbooks no longer require a complete row scan during every fit operation.
- Disabled OFD transform transitions until initial layout stabilizes, removing the first-frame jump while preserving reduced-motion behavior.
- Reduced the open-source binary PPT watermark to a single bottom-right mark while preserving the engine's mandatory licensing boundary.
- Hardened release automation around npm timeouts, uncertain registry state, and interrupted uploads.

## v2.2.7 — PDF zoom anchoring and legacy Word tolerance

Released August 11, 2026.

- Kept PDF zoom anchored to the current visible area instead of allowing the document to drift behind navigation.
- Improved tolerance for HTML-in-WordDocument legacy DOC files.
- Shipped the fixes consistently across npm, GitHub Releases, component repositories, the demo, documentation, website, and Docker images.

## Complete history

- [Browse all GitHub Releases](https://github.com/flyfish-dev/file-viewer/releases)
- [Read the complete Chinese changelog](/zh/changelog)
- [Verify the current format matrix](/guide/formats)
