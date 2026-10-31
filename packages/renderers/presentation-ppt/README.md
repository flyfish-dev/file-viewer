# @file-viewer/renderer-ppt

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/presentation-ppt/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/presentation-ppt/README.zh-CN.md)

Renderer for legacy binary `.ppt` and `.pot` files, using the Apache-2.0 compiled TypeScript `@file-viewer/ppt` engine. It is included in Office/All presets and Full packages; the smaller `standard` profile keeps it optional.

```ts
import { pptRenderer } from '@file-viewer/renderer-ppt'
```

Pass `pptRenderer` through the component's `renderers` option. A normal ESM bundler resolves the parsing Worker from the installed package without explicit URLs. Full and IIFE deployments include the verified self-hosted runtime in `vendor/ppt/dist/`.

No WASM, embedded fonts or persistent frame cache is required. Fonts come from the host browser. SVG layout and Canvas snapshots run on the main thread. The engine source remains private; preserve the package LICENSE and NOTICE.md. PPTX and editing/saving are outside this renderer's scope.
