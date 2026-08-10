---
layout: page
title: File Viewer
titleTemplate: false
---

<main class="doc-home doc-home-v2">
<nav class="doc-home-anchor" aria-label="Documentation home navigation">
<a href="#capability">Capability</a>
<a href="#demo">Demo</a>
<a href="#presets">Presets</a>
<a href="#ecosystem">Ecosystem</a>
<a href="#formats">Formats</a>
<a href="#delivery">Delivery</a>
</nav>

<section id="capability" class="doc-start doc-product-hero">
<div class="doc-start-copy">
<span class="doc-eyebrow">File Viewer Docs</span>
<h1>File Viewer: preview files entirely in the browser.</h1>
<p>
Browser-native preview should not need a conversion server. Uploading a private DOCX just to preview it is awful. File Viewer keeps Office, PDF, CAD, archives, email, and more in the browser. These docs cover the real integration paths, format limits, offline assets, and deployment checks.
</p>
<div class="doc-home-actions">
<a class="doc-action doc-action-primary" href="https://demo.file-viewer.app" target="_blank" rel="noreferrer">Try the demo</a>
<a class="doc-action" href="/guide/formats">View format matrix</a>
<a class="doc-action" href="/guide/quickstart">Open quickstart</a>
</div>
<div class="doc-start-stats" aria-label="File Viewer capability metrics">
<div><strong>208</strong><span>extension mappings</span></div>
<div><strong>25</strong><span>preview pipelines</span></div>
<div><strong>Offline</strong><span>self-hosted Worker / WASM / fonts</span></div>
<div><strong>Modular</strong><span>preset and renderer composition</span></div>
</div>
</div>

<figure class="doc-capability-panel doc-product-preview" aria-label="File Viewer browser-native DOCX preview workspace">
<picture>
<source media="(max-width: 720px)" srcset="/_media/file-viewer-demo-v2.2.6-mobile-en.webp" />
<img src="/_media/file-viewer-demo-v2.2.6-desktop-en.webp" alt="File Viewer browser-native DOCX preview workspace in English" width="1600" height="900" />
</picture>
<figcaption><strong>208 extensions</strong><span>25 lazy preview pipelines · self-hosted Worker, WASM, fonts, and vendor assets</span></figcaption>
</figure>
</section>

<section class="doc-section doc-capability-section">
<div class="doc-section-heading">
<span>Platform Capability</span>
<h2>More than file display: a production-ready preview layer for frontend teams.</h2>
<p>From format detection, rendering orchestration, asset loading, and user interaction to deployment, File Viewer splits complex preview behavior into controlled, testable, and upgradeable capability modules.</p>
</div>
<div class="doc-feature-grid">
<article class="doc-card"><strong>Format fidelity</strong><h3>Real business attachments</h3><p>PDF, Word, Excel, PPT/PPTX, OFD, Typst, CAD, DWF, PSD, Mermaid, PlantUML, and nested archive preview are maintained as focused modules.</p></article>
<article class="doc-card"><strong>Performance by design</strong><h3>Heavy dependencies load on demand</h3><p>Renderers, workers, WASM, fonts, and vendor assets are layered so the full IIFE entry does not push every capability into the first script.</p></article>
<article class="doc-card"><strong>Consistent interaction</strong><h3>Viewer-level operations stay unified</h3><p>Search, zoom, print, export, download, watermark, toolbar permissions, and lifecycle hooks stay consistent across preview pipelines.</p></article>
<article class="doc-card"><strong>Style isolation</strong><h3>Host CSS should not break preview surfaces</h3><p>Every standard component defaults to Shadow DOM. Customize through tokens and <code>::part()</code>; use <code>styleIsolation:'none'</code> only for legacy deep overrides.</p></article>
<article class="doc-card"><strong>Enterprise delivery</strong><h3>Public, intranet, and offline deployment</h3><p>Worker, WASM, and font assets can be self-hosted with Docker, static hosting, Cloudflare Pages, release packages, and private CDNs.</p></article>
</div>
</section>

<section id="demo" class="doc-demo-stage">
<div class="doc-section-heading">
<span>Live Experience</span>
<h2>Try real files before choosing what to ship.</h2>
<p>The v2.2.6 demo is an immersive document workspace: only the document surface scrolls, the source capsule and format toolbar stay fixed, each action owns a nearby panel, and mobile collapses secondary controls into one More menu.</p>
</div>
<div class="doc-demo-layout">
<figure class="doc-demo-visual">
<img src="/_media/file-viewer-demo-v2.2.6-formats-en.gif" alt="File Viewer v2.2.6 English demo with rich DOCX, PPTX, DWG, and interactive 3D STEP previews" width="1200" height="750" loading="lazy" />
<figcaption>The current English demo: the file capsule flows into the top action bar, while the filename and Samples action open the icon-led sample library.</figcaption>
</figure>
<div class="doc-demo-actions">
<a class="doc-path-card" href="https://demo.file-viewer.app" target="_blank" rel="noreferrer">
<strong>Main Demo</strong>
<span>Upload a file, paste a URL, or open real samples across the 208-extension registry, then verify unified zoom and format-specific tools.</span>
</a>
<a class="doc-path-card" href="https://demo.file-viewer.app/compare.html" target="_blank" rel="noreferrer">
<strong>Document Compare</strong>
<span>Side-by-side preview, synchronized scrolling, search navigation, and PDF toolbar hiding.</span>
</a>
<a class="doc-path-card" href="/guide/demo">
<strong>Demo Guide</strong>
<span>Review sample coverage, deployment boundaries, and common verification flows.</span>
</a>
</div>
</div>
</section>

<section id="presets" class="doc-section doc-section-muted doc-preset-section">
<div class="doc-section-heading">
<span>Modular Integration</span>
<h2>Install the component first. Add document capabilities deliberately.</h2>
<p>Production apps should start from the native component package, then add the smallest preset or renderer set that matches the product. <code>preset-all</code> is complete, but intentionally heavier.</p>
</div>
<div class="doc-preset-grid">
<article class="doc-card doc-preset-card">
<strong>Light attachments</strong>
<h3>@file-viewer/preset-lite</h3>
<p>Images, text, Markdown, code, and common media files.</p>
</article>
<article class="doc-card doc-preset-card">
<strong>Office workflows</strong>
<h3>@file-viewer/preset-office</h3>
<p>PDF, Word, Excel, PowerPoint, OFD, RTF, and OpenDocument workflows.</p>
</article>
<article class="doc-card doc-preset-card">
<strong>Engineering files</strong>
<h3>@file-viewer/preset-engineering</h3>
<p>CAD, EDA, 3D, geospatial, drawing, and structured engineering assets.</p>
</article>
<article class="doc-card doc-preset-card">
<strong>Full workbench</strong>
<h3>@file-viewer/preset-all</h3>
<p>Use for full-format workbenches and release validation. Evaluate size before using in business pages.</p>
</article>
</div>
<div class="doc-callout doc-callout-compact">
<strong>Installation boundary:</strong> installing <code>@file-viewer/vue3</code>, <code>@file-viewer/react</code>, or <code>@file-viewer/web</code> is the lightest integration path, but it does not include every renderer. Add the preset or renderer package for the formats you need.
</div>
<div class="doc-callout doc-callout-compact">
<strong>Full one-shot setup:</strong> heavy users, internal attachment centers, and validation environments can install the native <code>*-full</code> package. It already includes <code>preset-all</code>, so do not install or pass another preset. Vite publishes the matching Worker/WASM/font/vendor assets in dev and build through <code>fileViewerRenderers({ copyAssets:true })</code>; non-Vite projects run the same-version CLI included by the Full package.
<pre><code>pnpm add @file-viewer/vue3-full
pnpm add -D @file-viewer/vite-plugin # Vite
# Webpack / Vue CLI / Rspack / Rollup / Umi
npx --no-install file-viewer-copy-assets ./public/file-viewer</code></pre>
<p>For script-tag pages, deploy the complete <code>@file-viewer/web-full/dist/</code> directory; it already contains the full asset payload and needs no copy command.</p>
</div>
</section>

<section id="ecosystem" class="doc-section">
<div class="doc-section-heading">
<span>Native Ecosystem</span>
<h2>Native packages for every stack. iframe remains an integration option, not the core path.</h2>
<p>Every package shares the same core capabilities, options, events, search, zoom, print, export, and lifecycle hooks while keeping framework-native ergonomics.</p>
</div>
<div class="doc-path-grid doc-ecosystem-grid">
<a class="doc-path-card" href="/guide/quickstart-web"><strong>Vanilla JS / Web Component</strong><span>Custom Element or command-style mount for any page.</span></a>
<a class="doc-path-card" href="/guide/quickstart-vue3"><strong>Vue 3</strong><span>Plugin install, component props, events, refs/controllers, and toolbar customization.</span></a>
<a class="doc-path-card" href="/guide/quickstart-vue2"><strong>Vue 2.7 / Vue 2.6</strong><span>Legacy-friendly packages with the same option model as Vue 3.</span></a>
<a class="doc-path-card" href="/guide/quickstart-react"><strong>React / React Legacy</strong><span>Hooks, refs, event callbacks, and legacy React support.</span></a>
<a class="doc-path-card" href="/guide/ecosystem#svelte"><strong>Svelte</strong><span>Component and action-based integration for SvelteKit and lightweight apps.</span></a>
<a class="doc-path-card" href="/guide/ecosystem#jquery"><strong>jQuery</strong><span>Use <code>$(el).fileViewer(options)</code> in traditional admin systems.</span></a>
</div>
</section>

<section id="formats" class="doc-section doc-format-panel">
<div class="doc-section-heading">
<span>Format Matrix</span>
<h2>208 extension mappings, backed by 25 real preview pipelines.</h2>
<p>The matrix follows renderers registered in code. Heavy parsers, Workers, WASM, and offline vendor assets load only after a matching file type is selected; planned formats are not counted as current support.</p>
</div>
<div class="doc-format-grid">
<div><strong>Office</strong><span>DOCX / XLSX / PPT / PPTX / PDF / OFD / Typst</span></div>
<div><strong>Engineering</strong><span>DWG / DXF / DWF / 3D / GIS / EDA / OLB / DRA</span></div>
<div><strong>Knowledge</strong><span>Markdown / Code / Git patch / Git bundle / Mermaid / PlantUML</span></div>
<div><strong>Assets</strong><span>PSD / Images / HEIC / Audio / Video / Fonts / SQLite / Parquet</span></div>
<div><strong>Containers</strong><span>ZIP / RAR / 7Z / TAR / GZIP and nested preview</span></div>
<div><strong>Collaboration</strong><span>EML / MSG / XMind / draw.io / Excalidraw / EPUB / UMD</span></div>
</div>
<div class="doc-link-row">
<a href="/guide/formats">Open the format matrix</a>
<a href="/guide/format-fidelity">Review fidelity notes</a>
</div>
</section>

<section id="delivery" class="doc-final-band doc-final-band-v2">
<div>
<span>Delivery</span>
<h2>A complete delivery path for intranet, private deployment, and open-source distribution.</h2>
<p>
Docs, demo, official site, npm packages, Docker images, GitHub source aggregation, and release artifacts are maintained together. For higher fidelity and extreme performance, follow the official site to the commercial native document engine.
</p>
</div>
<div class="doc-final-actions">
<a class="doc-action doc-action-primary" href="/guide/distribution">Distribution</a>
<a class="doc-action" href="/guide/docker">Docker</a>
<a class="doc-action" href="https://github.com/flyfish-dev/file-viewer" target="_blank" rel="noreferrer">GitHub</a>
</div>
</section>
</main>
