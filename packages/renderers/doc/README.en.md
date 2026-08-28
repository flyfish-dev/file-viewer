# @file-viewer/doc

`@file-viewer/doc` is the open-source legacy MS-DOC (`.doc`) parser and HTML renderer used by File Viewer. It is extracted from the public `msdoc-viewer@0.2.0` line and maintained as the `docjs` source package.

## Install

```bash
npm install @file-viewer/doc
```

Historical imports from `msdoc-viewer` remain supported through the compatibility alias package.

## Usage

```ts
import { parseMsDoc, renderMsDoc } from '@file-viewer/doc'

const parsed = parseMsDoc(arrayBuffer)
const rendered = renderMsDoc(parsed)

container.innerHTML = `<style>${rendered.css}</style><div class="msdoc-root">${rendered.html}</div>`
```

External links and linked images are blocked by default. Trusted integrations
can opt in separately with `externalLinkPolicy: 'allow'` and
`externalResourcePolicy: 'allow'`; embedded images and bookmarks keep working.

The package also exports `parseMsDocToHtml`, `mountMsDoc`, `createMsDocViewer`, and `MsDocWorkerClient`.

## Scope

- OLE/CFB container parsing
- WordDocument, 0Table/1Table, CLX, FKP, CHPX, PAPX, STSH, and font table parsing
- Paragraph, character, table, image, OLE attachment, and basic field-code output
- Embedded picture extraction via MS-DOC PICF / OfficeArt BLIP records (PNG, JPEG, DIB, TIFF), with EMF/WMF → SVG conversion for browser preview
- Browser-native HTML/CSS rendering without server-side conversion
- Optional module worker entry at `@file-viewer/doc/worker`

This package intentionally tracks the old public `msdoc-viewer@0.2.0` code line and continues to harden that public MS-DOC path. Newer private document-engine work is not used here.
