# Supported Formats

<div class="doc-kicker">Format Truth</div>

<p class="doc-lead">
  The current core declares 25 preview pipelines and 208 file extensions.
  Renderers are loaded on demand, so opening a lightweight text file does not force the browser to load every heavy document engine.
</p>

<div class="doc-shot">
  <img src="/_media/file-viewer-demo-v2.2.6-samples-en.webp" alt="Flyfish Viewer v2.2.9 English format sample library with grouped filenames and format-specific icons" width="1440" height="900" loading="lazy" />
  <p class="doc-caption">The demo groups representative samples for all 25 preview pipelines. The active group opens by default, and each item carries its real filename, format label, and theme-aware file icon.</p>
</div>

## Main Preview Pipelines

| Category | Examples |
| --- | --- |
| Word | `docx`, `docm`, `dotx`, `dotm`, legacy `doc`, `dot`, plus RTF and ODT paths |
| Spreadsheets | `xlsx`, `xlsm`, `xlsb`, `xls`, `csv`, `tsv`, `ods`, `fods`, `numbers` |
| Presentations | binary `ppt`; OpenXML `pptx`, `pptm`, `potx`, `potm`, `ppsx`, `ppsm`; OpenDocument `odp` |
| Layout documents | `pdf`, `ofd`, `typ`, `typst` |
| Archives | `zip`, `7z`, `rar`, `tar`, `gz`, `tgz`, `cab`, `iso`, `apk`, `cbz`, `cbr`, and more |
| Email | `eml`, `msg`, `mbox` |
| Diagrams and mind maps | `xmind`, `drawio`, `dio`, `excalidraw`, `mermaid`, `mmd`, `plantuml`, `puml` |
| CAD and engineering | `dwg`, `dxf`, `dwf`, `dwfx`, `xps`, plus EDA files such as `gds`, `oas`, `oasis`, `olb`, `dra` |
| 3D and geospatial | `gltf`, `glb`, `obj`, `stl`, `ply`, `step`, `stp`, `iges`, `ifc`, `3dm`, `brep`, `geojson`, `kml`, `gpx`, `shp` |
| Text, code, and data | Markdown, source code, logs, JSON, YAML, TOML, SQL, IPYNB, SQLite, WASM, Parquet, Avro |
| Media and assets | Images, SVG, HEIC, audio, video, HLS, fonts, PSD-style design assets |

## Engineering Renderer Notes

- Word preview uses `@file-viewer/renderer-word`. The package lazy-loads the self-maintained DOCX engine, `msdoc-viewer`, and RTF/OpenDocument helpers only for DOCX/DOC/RTF/ODT files, so core-only and lightweight component installs do not pull Word engines by default.
- Presentation preview uses `@file-viewer/renderer-presentation` with two isolated engines. Binary PowerPoint 97–2003 `.ppt` lazy-loads the packaged `@file-viewer/ppt@0.3.3` Worker/OffscreenCanvas/WASM engine and bounded frame cache; OpenXML files lazy-load `@file-viewer/pptx` and its separate Worker. Standard Demo, Vite/full, copy-assets, and CDN/IIFE layouts need no PPT runtime URL configuration; use `options.presentation.pptModuleUrl` / `pptWorkerUrl` / `pptWasmUrl` / `pptFontUrl` only for custom `.ppt` asset layouts and `workerUrl` / `workerType` for PPTX.
- XMind uses `@file-viewer/renderer-mindmap` with XMind 8 XML and XMind 2020+ JSON package parsing, plus an `@panzoom/panzoom` powered canvas for drag panning, node-start dragging, mobile pinch zoom, keyboard panning, responsive fit-on-open/host-resize behavior, and unified toolbar state sync after pan/navigation.
- Mermaid and PlantUML are handled by `@file-viewer/renderer-drawing`. Mermaid lazy-loads the official `mermaid` renderer and outputs theme-aware SVG. PlantUML stays offline by default with an SVG source preview; configure `options.drawing.plantumlServerUrl` when an intranet PlantUML SVG service is available. If the endpoint is unavailable, the viewer renders the same offline preview instead of leaving the page blank. Both diagram surfaces support drag panning and renderer-native zoom controls through `@panzoom/panzoom`.
- Patch files are rendered with `diff2html` in side-by-side mode. Git bundles parse the bundle header, refs, commit objects, trees, readable blobs, and regular OFS_DELTA / REF_DELTA pack objects directly in the browser; very large packs or bundles that depend on external prerequisites surface a clear boundary notice instead of being silently misrepresented.
- EDA uses `@file-viewer/renderer-eda`. OLB and DRA are safe structure previews over common CFB/OLE2 containers, standard GDSII renders small layouts as SVG and larger element sets through WebGL typed-array batches, readable OASIS text fixtures render as SVG, and real SEMI binary OASIS remains a safe structure-index preview until the dedicated WASM/WebGL layout kernel is split out.
- CAD uses `@file-viewer/renderer-cad` and `@flyfish-dev/cad-viewer`; DWG, DWF, and DWFx assets remain self-hostable for offline deployments.
- Archives use `@file-viewer/renderer-archive` with `libarchive.js` Worker + WASM first, then ZIP/TAR/GZIP compatibility fallback when the Worker cannot start. Legacy ZIP files without the UTF-8 filename flag are decoded with GBK/GB18030 detection so Chinese entry names remain readable in the compatibility path.
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
