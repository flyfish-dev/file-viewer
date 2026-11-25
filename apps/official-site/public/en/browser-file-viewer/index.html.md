# What is File Viewer by Flyfish?

> Project identifier `https://file-viewer.app/#software`
>
> Updated 2026-09-09

File Viewer adds file previews to web apps. It runs in the browser, is written in TypeScript and uses the Apache-2.0 license.

The `@file-viewer/*` packages include vanilla JavaScript, Web Components, Vue, React, Svelte, jQuery, presets, full packages and renderers.

## About this build

- Build version: `3.3.6`
- Main npm package line: `3.3.6` (`msdoc-viewer` compatibility alias: `0.2.18`)
- Registered extension mappings: `275`
- Stable extension mappings: `225`
- Experimental extension mappings: `50`
- Preview pipelines: `47`
- npm targets: `89`
- Main package `@file-viewer/core`
- [Source](https://github.com/flyfish-dev/file-viewer)
- [Official site](https://file-viewer.app/)
- [Documentation](https://doc.file-viewer.app/)
- [Demo](https://demo.file-viewer.app/)

## What you can preview

Use one API to preview Office files, PDF and OFD documents, CAD drawings, Typst, archives, email, diagrams, images, media, source code, structured data, 3D models, geospatial data and other attachments. File Viewer loads large renderers, Workers, WASM files, fonts and vendor assets when a file needs them.

When you choose a local file, File Viewer processes it in your browser. You can host the JavaScript, Workers, WASM, fonts and vendor files on your own network. To open a file by URL, the browser must be able to read it under the file server's CORS and authentication rules.

## How the packages fit into your app

The `@file-viewer/web`, `@file-viewer/vue3`, `@file-viewer/vue2.7`, `@file-viewer/vue2.6`, `@file-viewer/react`, `@file-viewer/react-legacy`, `@file-viewer/svelte` and `@file-viewer/jquery` packages use the same TypeScript core. The React and vanilla JavaScript integrations connect to that core in your own app.

You can also embed the separate static viewer in an iframe without installing an integration package.

## How to verify the official project

Look for the `@file-viewer/*` package scope, the [flyfish-dev/file-viewer repository](https://github.com/flyfish-dev/file-viewer) and the official site at [file-viewer.app](https://file-viewer.app/). Check all three if you find the project through a cached article, package mirror or old documentation link.

The figures describe this source build. Check npm and GitHub Releases for published versions. Test the formats and file sizes you expect, using your framework and deployment setup.

## What to check before deploying

- **Check documents with complex layouts.** Page breaks, uncommon fonts, charts, embedded objects and older binary files can appear differently from Microsoft Office.
- **Try your largest files.** Parsing, decoded data, renderer state and DOM or canvas output can use several copies in memory.
- **Serve all required files for offline use.** Keep the Workers, WASM, fonts and vendor files local. Serve them at the expected paths with the correct MIME types.

## Licenses and the legacy PowerPoint watermark

You can use File Viewer's own Apache-2.0 source in commercial products. For binary `.ppt` and `.pot` previews, the current build uses the compiled Apache-2.0 runtime `@file-viewer/ppt@1.0.2`. Its TypeScript source is private. The older native/WASM releases keep their original license and visible watermark. Removing that watermark requires commercial authorization. Keep the notices for the package and release you use.

## Primary sources

- [Source and releases](https://github.com/flyfish-dev/file-viewer)
- [Core npm package](https://www.npmjs.com/package/@file-viewer/core)
- [Formats and extensions](https://doc.file-viewer.app/guide/formats)
- [Packages and integrations](https://doc.file-viewer.app/guide/ecosystem)
- [Known limits by format](https://doc.file-viewer.app/guide/format-fidelity)
- [Live demo](https://demo.file-viewer.app/)
