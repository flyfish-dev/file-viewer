# @file-viewer/eda-orcad

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/eda-orcad/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/eda-orcad/README.zh-CN.md)

Framework-neutral OrCAD / Allegro binary inspection helpers for Flyfish File Viewer. It provides CFB/OLE2 detection, safe text sampling, hex preview, and string extraction primitives without any UI dependency.

```ts
import {
  isOrcadCompoundFile,
  collectOrcadStrings,
  decodeOrcadSample,
} from '@file-viewer/eda-orcad'

const bytes = new Uint8Array(buffer)
const isCfb = isOrcadCompoundFile(bytes)
const strings = collectOrcadStrings([bytes])
const sample = decodeOrcadSample(bytes)
```

## Scope

- Used by `.olb`, `.dra`, `.psm`, `.pad`, and related OrCAD / Allegro proprietary binaries for structural indexing and safe fallback preview.
- No UI framework and no DOM dependency.
- Full symbol / footprint geometry parsing remains a separate C++ WASM or staged TypeScript porting path based on OpenOrCadParser / OpenAllegroParser style engines.

## Why This Package Exists

The public OrCAD / Allegro file format surface is limited. Keeping binary inspection and future WASM parser boundaries in a separate package lets `@file-viewer/renderer-eda` stay focused on presentation while the engine evolves independently.
