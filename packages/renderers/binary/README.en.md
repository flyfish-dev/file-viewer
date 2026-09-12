# @file-viewer/renderer-binary

`@file-viewer/renderer-binary` is an explicit, read-only binary inspector for File Viewer. It parses a reviewed built-in header catalog in a local module Worker and presents virtualized offset, hexadecimal, ASCII, structure-tree, and synchronized byte-selection views.

## Install and use

```ts
import FileViewer from '@file-viewer/vue3'
import { binaryRenderer } from '@file-viewer/renderer-binary'

const options = {
  rendererMode: 'replace',
  renderers: [binaryRenderer],
  binary: {
    maxFileBytes: 16 * 1024 * 1024,
  },
}
```

Vite applications can explicitly select it with `fileViewerRenderers({ formats: ['bin'] })`. This package is not part of the `preset-all`, Full, or Vue 2 dependency closure.

## Routing and scope

- It owns only `.bin`, `.hex`, `.elf`, `.exe`, `.dll`, `.class`, and `.macho`; it never claims `application/octet-stream`.
- PNG, ZIP, and WASM signatures are templates only when this package is explicitly selected. Dedicated renderers keep their routes.
- The first built-in catalog reads ELF, PE/COFF, Mach-O, PNG, ZIP, WebAssembly, and Java class headers, with a raw-byte fallback for unknown input.
- Editing, patching, user-authored templates, dynamic imports, and arbitrary binary scans are intentionally excluded.

## Safety limits

The default whole-file ceiling is 16 MiB. Parse time, structure nodes, nesting, and decoded string sizes are bounded; the Worker terminates after a result, timeout, error, or cancellation, and the UI renders only visible hex rows.
