# Source and distribution notice

Copyright 2026 Flyfish. The published TypeScript PPT runtime is distributed under Apache-2.0. The development source repository remains private. The public npm archive contains compiled JavaScript, declarations, this notice and the license; it does not contain TypeScript implementation files, source maps, private QA reports, documents or fonts. This grant does not apply to previous native/WASM package versions, which retain their original licenses.

The following foundation originated in the user's `flyfish-dev/msdoc-viewer` repository, main commit `a42f4a28cad75db19021ef70eaa8c10548e0eb26`, retrieved for this task:

- Binary reader and utility conventions used by `src/core/binary.ts`, `utils.ts`, `xml-text.ts`.
- Pure TypeScript DEFLATE code used by `src/core/inflate.ts`, with explicit output limits and exact-size/checksum validation added in this delivery.
- WMF/EMF-to-SVG conversion and vector font helpers used by `src/core/vector.ts` and `vector-font.ts`, with additional record, allocation and output bounds, bitmap transforms, alpha handling and SVG image-link compatibility in this delivery. The reused converter and its new extensions remain partial implementations of the metafile formats.
- Architecture and small geometry conventions from the project's container, worker, model, preset and shape-geometry modules. The new PPT container/persist/text/drawing logic was not copied from a legacy PowerPoint engine.

Exact origin paths, destination paths and local hashes are recorded in `docs/provenance.json`. The reuse is intentional and authorized by the user's instruction to base this work on msdoc-viewer; it is not presented as independently authored foundation code.

Microsoft Open Specifications are the normative PPT/CFB/OfficeArt/crypto format sources. TIFF and PICT use the original Aldus TIFF 6.0 and Apple Inside Macintosh QuickDraw specifications. SVG output follows the relevant W3C SVG specification; the Base64 encoder was independently authored from RFC 4648's alphabet, bit grouping and padding rules and checked against its standard test vectors. Links and field notes appear in `docs/spec-notes.md`, `docs/officeart.md`, `docs/renderer.md`, `docs/images.md` and `docs/encryption.md`. The specifications and their reference implementations are not redistributed as part of this source bundle.

Independent test documents from the Apache POI test-data collection were used as black-box inputs. No POI parser source files were fetched or used to implement this parser, and no third-party parser code was copied or translated. Their original document bytes are excluded from this delivery; provenance identifiers and validation outcomes are retained. Authorized private inputs include native binary `.ppt` and `.pot` files and a larger binary `.ppt` produced by LibreOffice from a PPTX solely for testing. This converted case is identified separately from native inputs; it does not add PPTX support to the product. Original and converted private documents, their page images and full requested-to-resolved font manifests remain outside the repository and package. `fixtures/showcase.ppt`, `fixtures/playback.ppt`, their PNG/PCM media, raster patterns and handcrafted encrypted fixtures were authored by the included independent fixture writers.

## External QA tools and distribution boundary

The following tools operate outside the production TypeScript implementation:

- **LibreOffice** is a black-box executable for test conversion and independent reference exports. Its implementation source was not read, copied or translated into this parser or renderer.
- **`@napi-rs/canvas`** supplies native Canvas measurements only to an explicitly selected external Node QA adapter. The adapter and native package are not bundled or required by the viewer.
- **Noto CJK, other system fallback fonts and Fontconfig** provide the QA environment's actual font files and family resolution. These fonts can differ from the document's requested fonts and PowerPoint's environment. No font binaries are shipped with the product.
- **Inkscape** exports SVG to PNG for limited visual inspection. Its consumer-specific rendering limitations, including the observed nested SVG clipping issue, are not browser or PowerPoint acceptance evidence.
- **Pillow** is an independent TIFF test encoder and pixel reference. It is not runtime code or a runtime dependency.

`package.json` declares no production, optional, peer or bundled dependencies. TypeScript, Playwright and the consumer build tools are development dependencies only. The public package allowlist contains compiled modules, declarations, README and license notices. It excludes development tools, source maps, TypeScript implementation files, QA adapters, native libraries, font binaries, private inputs, reference images and internal documentation. The private repository retains the engineering provenance and regression records.

This project's production runtime does not include or depend on the existing pptjs native/WASM engine, third-party PowerPoint parsers, proprietary Office binaries, external QA tools or font binaries. The cleanroom engineering claim is limited to independently implementing PPT-specific logic from documented format information, with the above reused foundation and black-box validation disclosed. It is not a legal certification or a separately audited two-team cleanroom process. Source provenance, successful parsing and agreement with an external QA renderer do not establish complete specification coverage or PowerPoint pixel equivalence; the implementation and evidence boundaries are tracked in `docs/spec-coverage.json` and `docs/spec-coverage.md`.
