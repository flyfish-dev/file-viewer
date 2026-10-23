# @file-viewer/renderer-epub

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/ebook/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/ebook/README.zh-CN.md)

Standalone ebook renderer package for Flyfish File Viewer. It handles `.epub` parsing, table-of-contents navigation, scrolling reading, previous/next navigation, reading progress, and `.umd` mobile ebook metadata, TOC, and zlib text blocks.

## Usage

```ts
import FileViewer from '@file-viewer/vue3'
import { ebookRenderer } from '@file-viewer/renderer-epub'

const options = {
  builtinRenderers: 'none',
  renderers: ebookRenderer,
}
```

You can also compose it with other renderers:

```ts
import { ebookRenderer } from '@file-viewer/renderer-epub'
import { pdfRenderer } from '@file-viewer/renderer-pdf'
import { archiveRenderer } from '@file-viewer/renderer-archive'

const options = {
  builtinRenderers: 'none',
  renderers: [pdfRenderer, archiveRenderer, ebookRenderer],
}
```

## Capabilities

- Parses `.epub` packages, OPF metadata, navigation, and chapter resources with the bundled `epubjs` engine. The engine is lazy-loaded and built against the pinned safe XML DOM implementation, so consumers do not need another package or a CDN.
- Parses `.umd` mobile ebook containers with the project parser and inflates text blocks through `pako`.
- Uses scrolling reading mode for compatibility, avoiding blank content in browsers that struggle with very wide paginated EPUB layouts.
- Supports TOC visibility, chapter jumping, previous/next navigation, and reading progress.
- Does not depend on any online service or public CDN, making it suitable for intranet knowledge bases, training materials, and long-form attachment preview.
- `dist/vendor/epubjs.NOTICE.txt` records the versions, sources, and license texts for the engine and every inlined dependency.

## Reading theme

The no-reload behavior applies to observed theme attributes, system color-scheme changes and the Vanilla core theme update path. Framework component and toolbar/controller option updates may reinitialize the preview.

EPUB chapters and navigation follow `options.theme`, including `system` and live changes. Dark reading overrides text and solid backgrounds without inverting images or reloading the chapter. Set `epub.darkMode: false` to retain the book's authored colors, or `true` to force dark reading. UMD and FB2 rendering are unchanged.

## Migration Note

The core package no longer bundles the EPUB / UMD renderer and no longer installs `epubjs` or `pako` directly. Install this renderer explicitly, or use `@file-viewer/preset-all`, when ebook preview is required. The EPUB engine ships as an offline, lazy-loaded artifact inside this package and does not enter the application's external production dependency tree.
