# @file-viewer/renderer-pptx

This renderer contains only modern OpenXML PowerPoint support. It does not install the legacy binary-PPT WASM, font, or runtime.

```ts
import { pptxRenderer } from '@file-viewer/renderer-pptx'
```

Install `@file-viewer/renderer-ppt` explicitly for legacy `.ppt`, or keep using the compatibility aggregate `@file-viewer/renderer-presentation` when both are required.

Worker resolution first honors `presentation.workerUrl` or a configured shared asset base, then uses an emitted or directly served package asset, then checks the standard asset-copy manifest. Unknown locations never fall back to a guessed application-relative URL; Angular, offline, and separate static directories use the standard asset-copy command without application aliases.
