# Overview

<div class="doc-kicker">One Component, One Line, Fast Integration</div>

<p class="doc-lead">
  File Viewer by Flyfish is a modular, offline-first file preview ecosystem for product teams that need reliable attachment preview inside real web applications.
</p>

## What It Solves

File Viewer by Flyfish lets users preview business attachments without downloading every file or sending private documents to a conversion backend. It covers Office documents, PDF/OFD, Typst, CAD, EDA, archives, email, diagrams, mind maps, 3D, media, code, and structured data through lazy renderer packages.

The canonical catalog declares **245 registered extensions** across **35 preview pipelines**: **222 stable** and **23 experimental**.

## Architecture

| Layer | Responsibility |
| --- | --- |
| `@file-viewer/core` | Framework-neutral contracts, renderer registry, events, assets, lifecycle, search, zoom, print, export, and shared utilities |
| Renderer packages | Heavy format-specific engines such as PDF, Word, Presentation, CAD, Typst, Archive, Email, EPUB, Drawing, Data, and EDA |
| Presets | Product-shaped renderer bundles: `preset-lite`, `preset-office`, `preset-engineering`, and `preset-all` |
| Component packages | Native integrations for Vanilla JS / Web Component, Vue, React, Svelte, and jQuery |
| Apps | Official site, documentation site, main demo, comparison demo, and component demos |

Core stays pure TypeScript and framework-neutral. Component packages depend on core and expose native APIs for their ecosystem.

## Why Modular

Most products do not need every heavy engine on first load. Install a minimal renderer set for a focused product, or use a preset when you need broader coverage. Worker, WASM, font, and vendor assets remain self-hostable for intranet and strict-CSP deployments.

The bundler-neutral path is `options.preset` / `options.renderers`: import the preset or renderer package and pass it to the component. In Vite projects, `@file-viewer/vite-plugin` is an optional assembly layer that removes manual imports after one plugin registration. It auto-discovers installed `@file-viewer/preset-*` packages and injects the matching capability registry, so the default Vite setup is still `fileViewerRenderers({ copyAssets:true })`. Use `@file-viewer/preset-all` for the fastest full-capability start, or explicit `formats`, `renderers`, `scan:true`, and `inject:false` only when a product needs strict bundle control.

Every standard component uses Shadow DOM by default so uncontrolled host CSS cannot break the viewer. Theme customization stays stable through `--file-viewer-*` tokens and `::part()`; use `options.styleIsolation:'none'` only for legacy deep overrides. See [Style Isolation And Customization](/guide/style-isolation).

## Main Entry Points

- Official site: [file-viewer.app](https://file-viewer.app)
- Documentation: [doc.file-viewer.app](https://doc.file-viewer.app)
- Live demo: [demo.file-viewer.app](https://demo.file-viewer.app)
- iframe demo entry: [demo.file-viewer.app/iframe.html?url=/example/en/calibre-demo.docx](https://demo.file-viewer.app/iframe.html?url=/example/en/calibre-demo.docx)
- Comparison demo: [demo.file-viewer.app/compare.html](https://demo.file-viewer.app/compare.html)
- GitHub: [github.com/flyfish-dev/file-viewer](https://github.com/flyfish-dev/file-viewer)
