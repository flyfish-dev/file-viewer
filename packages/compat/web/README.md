# @flyfish-group/file-viewer-web

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/compat/web/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/compat/web/README.zh-CN.md)

Pure web file preview package. This package is the historical alias of `@file-viewer/web` and ships the same `<flyfish-file-viewer>` Web Component, imperative `mountViewer` controller, IIFE global bundle, and asset-copy CLI.

```bash
npm install @flyfish-group/file-viewer-web
```

```html
<flyfish-file-viewer
  id="viewer"
  src="/files/demo.pdf"
  theme="light"
  toolbar-position="bottom-right"
  style="display:block;height:720px"
></flyfish-file-viewer>
```

```ts
import { defineFileViewerElement } from '@flyfish-group/file-viewer-web'

defineFileViewerElement()

const viewer = document.getElementById('viewer')
viewer.addEventListener('viewer-event', event => {
  console.log(event.detail.type, event.detail.payload)
})
viewer.reload()
```

Use `mountViewer(container, options)` when you need a fully imperative controller.

For authenticated files, download the file in your host application first and pass a `Blob` plus a filename:

```ts
const blob = await fetch('/api/files/contract', { credentials: 'include' }).then(res => res.blob())

const viewer = document.querySelector('flyfish-file-viewer')
viewer.file = blob
viewer.name = 'contract.pdf'
```

## Script Tag Usage

No-build projects can self-host the IIFE bundle. It exposes `window.FlyfishFileViewerWeb`:

```html
<script src="/vendor/file-viewer-web/flyfish-file-viewer-web.iife.js"></script>
<flyfish-file-viewer
  src="/files/demo.docx"
  theme="light"
  style="display:block;height:720px"
></flyfish-file-viewer>
```

Browsers cannot resolve a bare package name such as `@flyfish-group/file-viewer-web` without a build tool. Use a static URL, the IIFE global bundle, or an import map. Workers, WASM files, and examples can be self-hosted with:

```bash
npx --yes file-viewer-copy-assets ./public/file-viewer
```

`options` are passed to the shared core and cover theme, toolbar operations, watermarking, search, AI-friendly text chunks, unified zoom, archive workers, IndexedDB cache, and size limits. Lifecycle, operation availability, search state, and document location updates are emitted through `onEvent`.

New projects should prefer the standard package name `@file-viewer/web`. Official documentation: https://doc.file-viewer.app/
