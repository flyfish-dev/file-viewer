# @file-viewer/eda-layout

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/eda-layout/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/eda-layout/README.zh-CN.md)

Framework-neutral EDA layout inspection engine for Flyfish File Viewer. It exposes pure TypeScript APIs for standard GDSII record parsing, GDSII WebGL draw-batch generation, readable OASIS text-fixture parsing, and real binary OASIS upgrade boundaries without any UI dependency.

```ts
import {
  parseGdsLayout,
  parseOasisTextLayout,
  createEdaLayoutWebglBatch,
  inspectOasisLayout,
} from '@file-viewer/eda-layout'

const layout = parseGdsLayout(new Uint8Array(buffer))
const batch = layout ? createEdaLayoutWebglBatch(layout) : undefined
const oasisFixture = parseOasisTextLayout(new Uint8Array(buffer))
const oasis = inspectOasisLayout(new Uint8Array(buffer))
```

## Scope

- `parseGdsLayout()` reads standard GDSII stream records and returns structures, boundaries, paths, text labels, references, bounds, and warnings.
- `parseOasisTextLayout()` reads the project's OASIS-like text fixture format and returns the same read-only preview model, keeping demos and parser regression tests visually meaningful.
- `createEdaLayoutWebglBatch()` normalizes GDSII boundaries, paths, labels, and references into triangle / line / point typed arrays for UI renderers or custom WebGL layers.
- `inspectOasisLayout()` detects real binary OASIS files and keeps full repetition expansion / geometry rendering behind a dedicated WASM/WebGL engine boundary.
- No Vue, React, Web Component, or DOM dependency.
- `@file-viewer/renderer-eda` turns this engine output into the user-facing preview UI.

## Roadmap

GDSII now has browser WebGL batch output. `@file-viewer/renderer-eda` automatically uses a WebGL canvas for larger element sets and keeps SVG as the fallback for small layouts or browsers without WebGL. The readable OASIS text fixture keeps OAS/OASIS routing, layout UI, and browser smoke tests visually meaningful; industrial SEMI binary OASIS preview still needs a low-level record parser, repetition expansion, hierarchical cell navigation, incremental parsing, and tiled rendering. This package is the stable place to integrate a future KLayout/gdstk/OpenAccess-style WASM engine or a dedicated WebGL tile renderer.
