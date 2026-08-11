# Demo Guide

> **Maintainer-only commands:** this page contains complete-workspace release or verification examples that are not part of the public checkout. Public contributors should use the commands in `/README.md` or `/docs/guide/development.md`.

<!-- FILE_VIEWER_MAINTAINER_COMMANDS -->

<div class="doc-kicker">Real Samples, Real Renderers</div>

<p class="doc-lead">
  The official demo is the fastest way to verify the 208-extension, 25-pipeline registry against real renderer behavior, toolbar operations, mobile layout, archive nesting, comparison, and offline asset loading.
</p>

<div class="doc-shot">
  <img src="/_media/file-viewer-demo-v2.2.6-formats-en.gif" alt="Flyfish Viewer v2.2.7 English demo showing DOCX, PPTX, DWG, interactive 3D STEP, and the file-capsule fusion" width="1200" height="750" loading="lazy" />
  <p class="doc-caption">The current workspace starts with a real DOCX, reveals the file capsule when the top controls are engaged, then opens the sample library and switches renderer pipelines.</p>
</div>

## Demo URLs

- Main demo: [demo.file-viewer.app](https://demo.file-viewer.app)
- iframe entry: [demo.file-viewer.app/iframe?url=/example/en/calibre-demo.docx](https://demo.file-viewer.app/iframe?url=/example/en/calibre-demo.docx)
- Document comparison: [demo.file-viewer.app/compare.html](https://demo.file-viewer.app/compare.html)
- Official portal: [file-viewer.app](https://file-viewer.app)

## What To Check

| Area | What to verify |
| --- | --- |
| Source controls | Open file, Paste link, and Samples each open their own anchored panel instead of sharing one generic dialog |
| File capsule | The filename and correct format icon open the sample library; on desktop, the capsule separates on hover and flows back into the top bar one second after pointer leave |
| Recent files | URL and sample history persists in local storage, each item can be removed, and the compact history control restores the panel |
| Sample selector | Files are grouped by type, collapsible, icon-led, and the active file group stays discoverable in light and dark themes |
| Toolbar | Search, fit, theme, download, print, HTML export, watermark, zoom, navigation, and format-specific actions appear only when supported |
| Settings | More exposes the full option surface, including document-background mode, density, fit, watermark, archive, and current-format controls |
| PDF | Page thumbnails, outline tree, floating toolbar, fit-to-width, search highlights, and side panel toggling |
| Word | Stream-style document reading, correct text flow, printing without clipped first-page-only output |
| Spreadsheet | Sheet tabs remain readable on desktop and mobile; optional column resize can be enabled |
| Archive | Nested entries preview through the same renderer registry, with safe metadata filtering, cache support, optional compact `ui.density:'compact'` spacing via `?density=compact`, and `archive.entryActions.download` checks for hiding nested entry downloads independently from the viewer-level original download |
| Mobile | The filename stays centered, secondary controls collapse into one More action, only the document container scrolls, and heavy renderers remain lazy |

## Language-Aware Samples

The demo follows the browser language by default. Chinese browsers open the Chinese sample system; other languages open the English sample system. Use `?locale=zh-CN` or `?locale=en-US` for a stable locale; the historical `lang` parameter remains compatible.

The English demo uses public real-world samples for DOCX, PDF, PPTX, and XLSX, plus local lightweight fixtures for Markdown, text, logs, CSV, JSON, TypeScript, JavaScript, GeoJSON, glTF, and archive nesting. All files are served from the demo origin so enterprise intranet deployments do not depend on public CDNs at runtime.

<div class="doc-shot">
  <img src="/_media/file-viewer-demo-v2.2.6-samples-en.webp" alt="Flyfish Viewer v2.2.7 English dark sample library with format-specific file icons" width="1440" height="900" loading="lazy" />
  <p class="doc-caption">The sample library opens next to the active source, expands one group at a time, and uses coordinated dark-mode icon palettes instead of filtering light assets.</p>
</div>

## Demo File Handoff Protocol

The main demo and iframe entry share the same file handoff protocol. Prefer `/iframe.html` for customer systems: an explicit `url` enters immersive mode, hiding brand, history, and source controls while retaining the document and the active format toolbar. Clean-URL static hosts can also use `/iframe`. Existing systems that already use `/index.html?from=...&name=...` continue to work with the same `postMessage(Blob)` flow.

URL-based iframe:

```html
<iframe
  src="/file-viewer/iframe.html?url=/files/demo.docx"
  style="width:100%;height:720px;border:0"
  allow="fullscreen"
></iframe>
```

Blob handoff:

```html
<iframe
  id="viewer"
  src="/file-viewer/iframe.html?from=https%3A%2F%2Fapp.example.com&name=contract.docx"
></iframe>
<script>
  const file = await fetch('/api/files/contract.docx').then(response => response.blob())
  document.querySelector('#viewer').contentWindow.postMessage(file, 'https://static.example.com')
</script>
```

`from` must match the parent origin. The demo accepts a `Blob` from that origin, wraps it as a `File` with `name`, and renders it. To keep an older main-demo integration, use `/file-viewer/index.html?from=...&name=...` with the same protocol. For customer delivery, use the GitHub Release asset `file-viewer-v2-*-official-demo-iframe.tar.gz`; it includes `iframe-example.html`, `README.iframe.md`, `iframe-manifest.json`, examples, and offline Worker/WASM/vendor assets.

## Local Demo

```bash
pnpm install
pnpm dev
```

The Vite dev server serves the main demo. Open `/compare.html` on the same host to test side-by-side preview and the jsdiff-powered extracted-text view. DOCX and text files get aligned lines plus character-level additions and removals. PDF work is staged: it follows the PDF text layer, scanned PDFs need OCR, and an incomplete multi-page text layer stops instead of being presented as a complete diff.

## Production Smoke

The repository keeps browser smoke scripts for the demo and component packages:

```bash
pnpm verify:demo-browser-smoke
pnpm verify:demo-sample-click-regression
pnpm verify:component-browser-smoke
pnpm verify:browser-smoke
```

Use these checks before publishing a release that touches renderers, assets, toolbar behavior, search, print, or sample files.
