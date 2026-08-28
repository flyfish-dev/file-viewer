# @file-viewer/renderer-pptx

This renderer contains only modern OpenXML PowerPoint support. It does not install the legacy binary-PPT WASM, font, or runtime.

```ts
import { pptxRenderer } from '@file-viewer/renderer-pptx'
```

Install `@file-viewer/renderer-ppt` explicitly for legacy `.ppt`, or keep using the compatibility aggregate `@file-viewer/renderer-presentation` when both are required.
