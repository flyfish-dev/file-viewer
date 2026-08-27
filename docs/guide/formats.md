# Supported Formats

<div class="doc-kicker">Format Truth</div>

<p class="doc-lead">
  The canonical catalog registers 221 file extensions across 32 preview pipelines: 221 stable and 0 experimental.
  Renderers are loaded on demand, so opening a lightweight text file does not force the browser to load every heavy document engine.
</p>

<div class="doc-shot">
  <img src="/_media/file-viewer-demo-v2.2.6-samples-en.webp" alt="File Viewer by Flyfish v2.3.0 English format sample library with grouped filenames and format-specific icons" width="1440" height="900" loading="lazy" />
  <p class="doc-caption">The demo groups representative samples for all 32 preview pipelines. Stable rows require redistributable real-file fixtures and browser assertions; synthetic or renamed fixtures never count as evidence.</p>
</div>

## Main Preview Pipelines

| Category | Examples |
| --- | --- |
| Word | `docx`, `docm`, `dotx`, `dotm`, legacy `doc`, `dot`, RTF/ODT; structured stable `wpd`, `wp`, `wp5`, `wp6`, `hwp`, `hwpx` |
| Spreadsheets | `xlsx`, `xlsm`, `xlsb`, `xls`, `xla`, `xlam`, `csv`, `tsv`, `ods`, `fods`, `dbf`; stable high-fidelity `numbers` |
| Presentations | binary `ppt`, `pot`; OpenXML `pptx`, `pptm`, `potx`, `potm`, `ppsx`, `ppsm`; OpenDocument `odp`; stable high-fidelity `key` |
| Apple documents | stable high-fidelity `pages`, `numbers`, and `key` with iWork '09 XML/APXL and modern Snappy/IWA parser paths |
| Layout documents | `pdf`, `ofd`, `typ`, `typst` |
| Digital signatures (explicit opt-in, experimental) | `p7m`, `p7s`, `p7b`, `p7c`, `pkcs7`, `cms`, `cmsc`, `tsq`, `tsr`, `tst`, `tsd`, `asc`, `sig`, `pgp`, `gpg` through `@file-viewer/renderer-signature`; not included in `preset-all` or `*-full` packages |
| Archives | `zip`, `7z`, `rar`, `tar`, `gz`, `tgz`, `cab`, `iso`, `apk`, `cbz`, `cbr`, and more |
| Email | `eml`, `msg`, `mbox` |
| Diagrams and mind maps | `xmind`, `drawio`, `dio`, `excalidraw`, `mermaid`, `mmd`, `plantuml`, `puml` |
| CAD and engineering | `dwg`, `dxf`, `dwf`, `dwfx`, `xps`, plus EDA files such as `gds`, `oas`, `oasis`, `olb`, `dra` |
| 3D and geospatial | `gltf`, `glb`, `obj`, `stl`, `ply`, `step`, `stp`, `iges`, `ifc`, `3dm`, `brep`, `geojson`, `kml`, `gpx`, `shp` |
| Text, code, and data | Markdown, source code, logs, JSON, YAML, TOML, SQL, IPYNB, SQLite, WASM, Parquet, Avro |
| Media and assets | Images, SVG, HEIC, audio, video, HLS, fonts, PSD-style design assets |

## Office and Apple evidence boundary

- `xla`, `xlam`, `pot`, `dbf`, and `fb2` have real container fixtures, parser assertions, hashes, and Demo smoke cases. Macro and add-in code is never executed.
- `pages`, `numbers`, and `key` include iWork '09 and modern IWA parser fixtures, bounded ZIP/Snappy/Protobuf parsing in a module Worker, a normalized static scene model, search/text layers, sheet/slide navigation, notes, and explicit encrypted-file detection.
- `pages`, `numbers`, and `key` are **high-fidelity / stable**. The gate covers iWork '09, 2013+, and current Apple 15.3.1 native containers with exact structural assertions, real-browser smoke, and fixed-font visual goldens. Pages/Keynote use a 3% pixel-difference threshold and Numbers uses 5%; Quick Look images remain loading placeholders or explicit limited-preview fallbacks only.
- Stable Apple support means static high fidelity: Keynote animations, transitions, and video are not executed; Numbers reads saved formula results instead of recalculating them; encrypted `iwpv2` files are detected and reported; missing fonts surface substitution information.
- `wpd/wp/wp5/wp6` are **structured / stable**. A checksum-pinned MPL-2.0 libwpd/librevenge WebAssembly Worker extracts text, styles, tables, headers, footers, and notes from licensed genuine WP 4.2, 5.0, 5.1, and 6.x fixtures. Chromium, Firefox, and WebKit smoke the packaged Worker/WASM path; `wp5` and `wp6` remain routing aliases and renamed files do not count as fixture evidence. Macros are never executed, and bounded text is only a runtime fallback.
- `hwp/hwpx` are **structured / stable** with redistributable Apache-2.0 HWP v5 and HWPX fixtures. The gate covers page geometry, inline styles, merged tables, headers, footers, notes, and embedded images in Chromium, Firefox, and WebKit. Encrypted, DRM, and distribution documents are detected and rejected explicitly; rare controls and producer-specific layout constructs remain documented limitations.

The full machine-readable matrix, including containers, levels, status, and limits, is generated from `ecosystem/format-catalog.json` into [`docs/generated/format-catalog.md`](/generated/format-catalog).

The signature row is an additional experimental, package-owned definition and is not counted in the 221-extension default catalog above. It must be installed and registered explicitly. Parsing or a valid cryptographic result does not establish certificate trust, policy compliance, qualified-signature status, identity assurance, or legal validity.

## Engineering Renderer Notes

- Word preview uses `@file-viewer/renderer-word`. The package lazy-loads the self-maintained DOCX engine, `msdoc-viewer`, and RTF/OpenDocument helpers only for DOCX/DOC/RTF/ODT files, so core-only and lightweight component installs do not pull Word engines by default.
- Spreadsheet preview uses `@file-viewer/renderer-spreadsheet` with `styled-exceljs` and `e-virt-table`. It preserves Office 365 and WPS in-cell images alongside workbook drawing images; double-clicking a rendered image opens a full-size preview that can be dismissed with Escape, the backdrop, or the close button.
- Presentation preview uses `@file-viewer/renderer-presentation` with two isolated engines. Binary PowerPoint 97–2003 `.ppt` lazy-loads the packaged `@file-viewer/ppt@0.3.3` Worker/OffscreenCanvas/WASM engine and bounded frame cache; OpenXML files lazy-load `@file-viewer/pptx` and its separate Worker. Standard Demo, Vite/full, copy-assets, and CDN/IIFE layouts need no PPT runtime URL configuration; use `options.presentation.pptModuleUrl` / `pptWorkerUrl` / `pptWasmUrl` / `pptFontUrl` only for custom `.ppt` asset layouts and `workerUrl` / `workerType` for PPTX.
- XMind uses `@file-viewer/renderer-mindmap` with XMind 8 XML and XMind 2020+ JSON package parsing, plus an `@panzoom/panzoom` powered canvas for drag panning, node-start dragging, mobile pinch zoom, keyboard panning, responsive fit-on-open/host-resize behavior, and unified toolbar state sync after pan/navigation.
- Mermaid and PlantUML are handled by `@file-viewer/renderer-drawing`. Mermaid lazy-loads the official `mermaid` renderer and outputs theme-aware SVG. PlantUML stays offline by default with an SVG source preview; configure `options.drawing.plantumlServerUrl` when an intranet PlantUML SVG service is available. If the endpoint is unavailable, the viewer renders the same offline preview instead of leaving the page blank. Both diagram surfaces support drag panning and renderer-native zoom controls through `@panzoom/panzoom`.
- Patch files are rendered with `diff2html` in side-by-side mode. Git bundles parse the bundle header, refs, commit objects, trees, readable blobs, and regular OFS_DELTA / REF_DELTA pack objects directly in the browser; very large packs or bundles that depend on external prerequisites surface a clear boundary notice instead of being silently misrepresented.
- EDA uses `@file-viewer/renderer-eda`. OLB and DRA are safe structure previews over common CFB/OLE2 containers, standard GDSII renders small layouts as SVG and larger element sets through WebGL typed-array batches, readable OASIS text fixtures render as SVG, and real SEMI binary OASIS remains a safe structure-index preview until the dedicated WASM/WebGL layout kernel is split out.
- CAD uses `@file-viewer/renderer-cad` and `@flyfish-dev/cad-viewer`; DWG, DWF, and DWFx assets remain self-hostable for offline deployments.
- Archives use `@file-viewer/renderer-archive` with `libarchive.js` Worker + WASM first, then ZIP/TAR/GZIP compatibility fallback when the Worker cannot start. Legacy ZIP files without the UTF-8 filename flag are decoded with GBK/GB18030 detection so Chinese entry names remain readable in the compatibility path.
- Media uses `@file-viewer/renderer-media` and native browser decoders first. When Chromium rejects an MPEG-4 Part 2 (`mp4v`) Simple Profile track, the renderer loads a dedicated Worker and the Apache-2.0 AOSP PacketVideo decoder. It uses the AAC track as the playback clock and draws decoded I420 frames to a Canvas. The WASM file is 111,379 bytes, or 34,410 bytes with gzip, and loads only after native decoding fails. The implementation contains no FFmpeg, libav, or LGPL/GPL/AGPL source. Files outside the decoder's current coverage get an explicit compatibility notice.
- STEP, IGES, IFC, 3DM, and BREP use the `@file-viewer/renderer-3d` entry plus the lightweight `@file-viewer/geometry-engine` route package for signature detection and accurate conversion guidance. Full visual decoding still belongs in dedicated OpenCascade / web-ifc / rhino3dm WASM paths, not in core or default component installs.

## Binary PPT Engine License Boundary

The public `@file-viewer/ppt` build renders `.ppt` files with its required visible watermark and keeps its own package license; it is not covered by File Viewer's Apache-2.0 license. Demo, Full, copy-assets, and CDN/IIFE outputs include its matching public runtime. Removing the PPT watermark requires commercial authorization. The integrity check also requires Web Crypto SHA-256, so deploy this path in a secure browser context (normally HTTPS or localhost).

## Capability Model

Each renderer reports what it can safely do. The common toolbar then shows download, print, HTML export, zoom, search, and navigation only when the active file type supports those operations.

This avoids pretending that every format supports the same operations. Word and PDF can use full-page print adapters, images can zoom naturally, archives can lazy-extract nested entries, and virtual spreadsheet tables are provided by `@file-viewer/renderer-spreadsheet` to avoid fragile outer CSS scaling.

## Best Evaluation Path

1. Open the [live demo](https://demo.file-viewer.app).
2. Try the sample closest to your production files.
3. Test your own file through upload or URL.
4. Use the [comparison demo](https://demo.file-viewer.app/compare.html) for contract, report, and generated-output review.
5. If a standard-package deployment is offline or CSP-restricted, run `npx --yes file-viewer-copy-assets ./public/file-viewer`; Full packages use their included same-version `npx --no-install file-viewer-copy-assets ./public/file-viewer`. Point renderer assets to your own static path.
