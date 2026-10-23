# @file-viewer/renderer-ofd

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/ofd/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/ofd/README.zh-CN.md)

Standalone OFD renderer for Flyfish File Viewer. It uses the pure-browser DLTech21/ofd.js pipeline and lazy-loads the OFD vendor, XML parser, and ZIP parser only when an `.ofd` document is opened.

## Install

```bash
pnpm add @file-viewer/core @file-viewer/renderer-ofd
```

## Usage

```ts
import FileViewer from '@file-viewer/vue3'
import { ofdRenderer } from '@file-viewer/renderer-ofd'

const options = {
  rendererMode: 'replace',
  renderers: ofdRenderer,
}
```

Use `@file-viewer/preset-all` when you need the same full format matrix as the official demo, or compose it with other renderer packages:

```ts
import { ofdRenderer } from '@file-viewer/renderer-ofd'
import { pdfRenderer } from '@file-viewer/renderer-pdf'

const options = {
  rendererMode: 'replace',
  renderers: [pdfRenderer, ofdRenderer],
}
```

## Features

- Preview `.ofd` documents in the browser.
- Preview electronic seal appearance (SES seal images and nested OFD seals) using `StampAnnot` boundaries; preview does not perform cryptographic verification.
- Lazy-load the OFD parser and renderer at the format boundary.
- Ship the vendor files inside the npm package for offline and intranet deployments.
- Support unified zoom, print, HTML export, and lifecycle context integration.

## Migration Note

OFD rendering has moved out of `@file-viewer/core` into this package. `jszip`, the local XML parsing logic, and the DLTech21/ofd.js vendor files are now owned by `@file-viewer/renderer-ofd`. Installing core or a standard component package no longer pulls OFD parsing dependencies; explicitly assemble this renderer when OFD preview is needed, or use `@file-viewer/preset-all`.

## Documentation

- On-demand renderer architecture: <https://doc.file-viewer.app/guide/on-demand-renderers>
- Supported formats: <https://doc.file-viewer.app/guide/formats>
