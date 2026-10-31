# Format Fidelity

<div class="doc-kicker">Clear Capability Boundaries</div>

<p class="doc-lead">
  File Viewer by Flyfish documents what is fully rendered, what is structurally inspected, and which formats need specialist engines for perfect fidelity.
</p>

## High-confidence Preview Lines

- PDF, OFD, images, audio, video, Markdown, source code, text, JSON/YAML/TOML/XML/SQL, archives, email, EPUB, Mermaid, Excalidraw, draw.io, and common Office/OpenDocument files.
- CAD preview is powered by `@flyfish-dev/cad-viewer` through `@file-viewer/renderer-cad`; DWG, DXF, DWF, and DWFx assets stay self-hostable.
- STEP / STP, IGES / IGS, and BREP preview uses a self-hosted OCCT worker, runtime, and WASM module to build renderable meshes locally, with orbit controls, fit-to-view, and unified zoom.
- Word preview uses `@file-viewer/renderer-word` and the self-maintained `@file-viewer/docx` path for readable stream-style DOCX rendering.
- Presentation preview uses two independent engines: binary `.ppt` / `.pot` uses the Apache-2.0 compiled TypeScript `@file-viewer/ppt@1.0.1` package; PPTX/OpenXML uses `@file-viewer/pptx`. Full/CDN/IIFE distributions include matching self-hosted assets. PPT parses in a Worker and renders SVG/Canvas on the main thread without WASM or embedded fonts; host fonts and complex effects can affect layout. The engine source remains private, and previous native releases retain their own license and watermark requirements.

## Structure-first Lines

Some engineering formats are intentionally conservative:

| Format family | Current behavior |
| --- | --- |
| OLB / DRA | Safe structure preview for common OrCAD / Allegro containers and readable metadata |
| OAS / OASIS | Readable fixtures render; complex binary OASIS stays structure-index focused until the dedicated layout kernel matures |
| IFC | Optional experimental local visual preview through `@file-viewer/renderer-3d/ifc`, with self-hosted That Open / `web-ifc` assets, fit, selection and property inspection; the official Demo includes IFC4 and IFC4.3 fixtures |
| Streaming Geo3D | Explicit experimental `@file-viewer/renderer-3d/geo3d` path for LAS/LAZ/COPC, GeoTIFF/COG, CityJSON, 3D Tiles and 3TZ. COPC/COG/3D Tiles preserve progressive/range access; TIFF is metadata-sniffed before takeover; 3TZ extraction applies traversal/size/count/duplicate guards. Self-host the decoder assets and validate production dataset sizes; converting LAS/LAZ to COPC and GeoTIFF to COG can improve streaming. |
| 3DM | Signature detection and integration guidance; a dedicated `rhino3dm` renderer is still required for visual preview |
| PlantUML | Offline source/SVG-style preview by default; configure an intranet PlantUML service for full server-rendered SVG |

## Verification

Use the built-in checks when the format matrix changes:

```bash
pnpm verify:public-release-facts
pnpm type-check
pnpm test
```
