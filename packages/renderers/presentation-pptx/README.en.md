# @file-viewer/renderer-pptx

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/presentation-pptx/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/presentation-pptx/README.zh-CN.md)

This renderer contains only modern OpenXML PowerPoint support. It does not install the legacy binary-PPT WASM, font, or runtime.

```ts
import { pptxRenderer } from '@file-viewer/renderer-pptx'
```

Install `@file-viewer/renderer-ppt` explicitly for legacy `.ppt`, or keep using the compatibility aggregate `@file-viewer/renderer-presentation` when both are required.

Worker resolution first honors `presentation.workerUrl` or a configured shared asset base, then uses an emitted or directly served package asset, then checks the standard asset-copy manifest. Unknown locations never fall back to a guessed application-relative URL; Angular, offline, and separate static directories use the standard asset-copy command without application aliases.

An HTTP(S) PPTX module Worker on another origin loads through an owned Blob module entry. The original module URL remains the base for its relative imports and assets. The server must allow CORS, and the page's CSP must permit both `blob:` and the asset origin in `worker-src`, plus applicable `connect-src` access for fetched assets. A blocked load remains an error; it does not fall back to parsing on the main thread. Explicit classic Workers keep their original loading behavior. For cold offline use, copy the complete matching assets to the page's origin; an uncached CDN module still requires a network connection. See [module Worker loading and CSP](https://developer.mozilla.org/en-US/docs/Web/API/Worker/Worker).
