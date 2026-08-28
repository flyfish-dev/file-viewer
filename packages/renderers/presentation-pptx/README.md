# @file-viewer/renderer-pptx

仅包含现代 OpenXML PowerPoint 格式的渲染器。该包不会安装旧版二进制 PPT 的 WASM、字体或运行时。

```ts
import { pptxRenderer } from '@file-viewer/renderer-pptx'
```

需要同时支持旧 `.ppt` 时，可显式安装 `@file-viewer/renderer-ppt`，或继续使用兼容聚合包 `@file-viewer/renderer-presentation`。
