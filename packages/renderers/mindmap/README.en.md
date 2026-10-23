# @file-viewer/renderer-mindmap

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/mindmap/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/mindmap/README.zh-CN.md)

Standalone XMind and mind map renderer package for Flyfish File Viewer. It parses modern `content.json` and classic `content.xml` XMind files, then renders an interactive `@panzoom/panzoom` powered canvas with drag panning, mobile pinch zoom, keyboard panning, responsive viewport fitting, unified toolbar state sync, sheet tabs, and node navigation.

## Usage

```ts
import FileViewer from '@file-viewer/vue3'
import { mindmapRenderer } from '@file-viewer/renderer-mindmap'

const options = {
  rendererMode: 'replace',
  renderers: mindmapRenderer,
}
```

You can combine it with other renderer packages:

```ts
import { pdfRenderer } from '@file-viewer/renderer-pdf'
import { mindmapRenderer } from '@file-viewer/renderer-mindmap'

const options = {
  rendererMode: 'replace',
  renderers: [pdfRenderer, mindmapRenderer],
}
```

## Capabilities

- Supports `.xmind`.
- Supports XMind 2020+ `content.json` and XMind 8 / Classic `content.xml`.
- Supports multiple sheets, hierarchy, labels, notes, hyperlinks, image resource hints, summaries, callouts, and floating-topic states.
- Supports toolbar zoom, fit-to-canvas, Panzoom drag panning, requestAnimationFrame-coalesced pan updates, `Ctrl` / `Command` + wheel pointer zoom, arrow-key panning, and mobile pinch zoom.
- Auto-fits the canvas on first render and host resize; after a user pans, wheels, or zooms manually, the renderer preserves the current view and only clamps unsafe bounds.
- Release browser smoke runs a real `.xmind` pan regression across normal Pointer, node-start dragging, wheel panning, and real mouse drag paths, so the canvas cannot silently regress into a non-draggable preview.

## Migration Note

The core package no longer bundles the XMind parser and no longer installs `@ljheee/xmind-parser` by default. Install this renderer explicitly, or use `@file-viewer/preset-all`, when XMind preview is required.
