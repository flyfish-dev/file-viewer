# @file-viewer/renderer-pptx

仅包含现代 OpenXML PowerPoint 格式的渲染器。该包不会安装旧版二进制 PPT 的 WASM、字体或运行时。

```ts
import { pptxRenderer } from '@file-viewer/renderer-pptx'
```

需要同时支持旧 `.ppt` 时，可显式安装 `@file-viewer/renderer-ppt`，或继续使用兼容聚合包 `@file-viewer/renderer-presentation`。

Worker 选择顺序为显式 `presentation.workerUrl` 或共享资源根目录、打包器已输出或包目录内可解析的 Worker、标准复制工具的资源清单。未知路径不会回退为猜测的应用相对地址；Angular、离线或独立静态目录使用标准资产复制，无需业务 alias。
