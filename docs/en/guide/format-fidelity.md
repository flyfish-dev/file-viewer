# Format Fidelity

> **Maintainer-only commands:** this page contains complete-workspace release or verification examples that are not part of the public checkout. Public contributors should use the commands in `/README.md` or `/docs/guide/development.md`.

<!-- FILE_VIEWER_MAINTAINER_COMMANDS -->

<div class="doc-kicker">Clear Capability Boundaries</div>

<p class="doc-lead">
  Flyfish Viewer documents what is fully rendered, what is structurally inspected, and which formats need specialist engines for perfect fidelity.
</p>

## High-confidence Preview Lines

- PDF, OFD, images, audio, video, Markdown, source code, text, JSON/YAML/TOML/XML/SQL, archives, email, EPUB, Mermaid, Excalidraw, draw.io, and common Office/OpenDocument files.
- CAD preview is powered by `@flyfish-dev/cad-viewer` through `@file-viewer/renderer-cad`; DWG, DXF, DWF, and DWFx assets stay self-hostable.
- STEP / STP, IGES / IGS, and BREP preview uses a self-hosted OCCT worker, runtime, and WASM module to build renderable meshes locally, with orbit controls, fit-to-view, and unified zoom.
- Word preview uses `@file-viewer/renderer-word` and the self-maintained `@file-viewer/docx` path for readable stream-style DOCX rendering.
- Presentation preview uses `@file-viewer/renderer-presentation` with two isolated native engines: PowerPoint 97–2003 `.ppt` lazy-loads the independently versioned native-WASM `@file-viewer/ppt@0.3.3` runtime, while PPTX/OpenXML lazy-loads `@file-viewer/pptx` and its Worker. Full and CDN/IIFE distributions ship both routes' matching assets; `@file-viewer/ppt` keeps its included license and visible public watermark.

## Structure-first Lines

Some engineering formats are intentionally conservative:

| Format family | Current behavior |
| --- | --- |
| OLB / DRA | Safe structure preview for common OrCAD / Allegro containers and readable metadata |
| OAS / OASIS | Readable fixtures render; complex binary OASIS stays structure-index focused until the dedicated layout kernel matures |
| IFC / 3DM | Signature detection and integration guidance; dedicated `web-ifc` / That Open and `rhino3dm` renderers are still required for visual preview |
| PlantUML | Offline source/SVG-style preview by default; configure an intranet PlantUML service for full server-rendered SVG |

## Verification

Use the built-in checks when the format matrix changes:

```bash
pnpm verify:format-support
pnpm verify:smoke-matrix
pnpm verify:renderer-assets
```
