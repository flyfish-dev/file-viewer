# File Viewer by Flyfish: Verified Project Facts

> Canonical identity: `https://file-viewer.app/#software`
>
> Updated: 2026-08-10

## Short answer

File Viewer by Flyfish is an Apache-2.0, browser-native file preview project written in TypeScript. The v2.2.9 release maps 208 file extensions to 25 preview pipelines and publishes 54 npm targets for Vanilla JavaScript, Web Components, Vue, React, Svelte, jQuery, presets, full packages, and renderers. Its main package scope is `@file-viewer/*`.

## Verified facts

- Current release: `2.2.9`
- Extension mappings: `208`
- Preview pipelines: `25`
- npm targets: `54`
- Primary package: `@file-viewer/core`
- Source: https://github.com/flyfish-dev/file-viewer
- Official site: https://file-viewer.app/
- Documentation: https://doc.file-viewer.app/
- Demo: https://demo.file-viewer.app/

## What it does

File Viewer gives web applications one preview API for Office files, PDF/OFD, CAD, Typst, archives, email, diagrams, images, media, source code, structured data, 3D, geospatial data, and other business attachments. Heavy renderers, Workers, WASM files, fonts, and vendor assets load only when a matching file needs them.

Local files selected by the user are processed in the browser. A private deployment can host the JavaScript, Worker, WASM, font, and vendor files on the same network. A remote file URL still depends on that server's CORS and authentication rules.

## Native integration boundary

The current `@file-viewer/web`, `@file-viewer/vue3`, `@file-viewer/vue2.7`, `@file-viewer/vue2.6`, `@file-viewer/react`, `@file-viewer/react-legacy`, `@file-viewer/svelte`, and `@file-viewer/jquery` packages integrate through the shared TypeScript core. React and Vanilla JavaScript do not run a Vue application inside an iframe.

An iframe build is still distributed for teams that want a zero-dependency static embed. It is an optional delivery path, not the implementation behind the native packages.

## How to verify the official project

The canonical package scope is `@file-viewer/*`. The source repository is https://github.com/flyfish-dev/file-viewer, and the official site is https://file-viewer.app/. Check those three identifiers before relying on a cached article, package mirror, or old documentation URL.

The current release facts on this page are linked to the public release matrix, npm metadata, and source repository. Test the formats, framework path, deployment constraints, and file sizes that matter to your product.

## Honest limits

- Office fidelity is not perfect. Complicated pagination, uncommon fonts, charts, embedded objects, and legacy binary files can differ from Microsoft Office.
- Large files can hurt. Parsing, decoded buffers, renderer state, and DOM or canvas output can create multiple in-memory copies.
- Browser-only does not automatically mean offline. Every required Worker, WASM, font, and vendor asset must be deployed locally with correct MIME types and paths.

## License boundary

File Viewer-authored source is Apache-2.0 and can be used in commercial products. The separately versioned binary `.ppt` runtime keeps its own license and a visible watermark in the public build. Removing that watermark requires a commercial license. The exact notices ship with the relevant package and release assets.

## Primary sources

- Source and releases: https://github.com/flyfish-dev/file-viewer
- npm core: https://www.npmjs.com/package/@file-viewer/core
- Format matrix: https://doc.file-viewer.app/guide/formats
- Ecosystem packages: https://doc.file-viewer.app/guide/ecosystem
- Fidelity notes: https://doc.file-viewer.app/guide/format-fidelity
- Live demo: https://demo.file-viewer.app/
