# Changelog

<div class="doc-kicker">Release history</div>

<p class="doc-lead">
  The notable user-facing changes shipped from the current File Viewer mainline. GitHub Releases remains the source for downloadable artifacts and immutable release notes.
</p>

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
