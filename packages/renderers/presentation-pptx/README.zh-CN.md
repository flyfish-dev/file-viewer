# @file-viewer/renderer-pptx

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/presentation-pptx/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/presentation-pptx/README.zh-CN.md)

仅包含现代 OpenXML PowerPoint 格式的渲染器。该包不会安装旧版二进制 PPT 的 WASM、字体或运行时。

```ts
import { pptxRenderer } from '@file-viewer/renderer-pptx'
```

需要同时支持旧 `.ppt` 时，可显式安装 `@file-viewer/renderer-ppt`，或继续使用兼容聚合包 `@file-viewer/renderer-presentation`。

Worker 选择顺序为显式 `presentation.workerUrl` 或共享资源根目录、打包器已输出或包目录内可解析的 Worker、标准复制工具的资源清单。未知路径不会回退为猜测的应用相对地址；Angular、离线或独立静态目录使用标准资产复制，无需业务 alias。

HTTP(S) 跨域 PPTX 模块 Worker 会通过本页拥有的 Blob 模块入口加载，原模块 URL 仍作为相对导入和资源地址的基准。资源服务器须允许 CORS，页面 CSP 须在 `worker-src` 同时允许 `blob:` 和资源来源，并在适用的 `connect-src` 中允许资源请求。加载被策略阻止时会保留错误，不转到主线程解析。显式 classic Worker 保留原加载方式。需要冷启动离线使用时，将匹配版本的完整资源复制到页面同源目录；未缓存的 CDN 模块仍需要网络。参见 [模块 Worker 加载与 CSP](https://developer.mozilla.org/en-US/docs/Web/API/Worker/Worker)。
