# @file-viewer/renderer-ppt

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/presentation-ppt/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/presentation-ppt/README.zh-CN.md)

旧版二进制 `.ppt` / `.pot` 渲染器，使用 Apache-2.0 的 TypeScript `@file-viewer/ppt` 编译引擎。Office/All preset 和 Full 包已包含该能力，较小的 `standard` 配置保持按需安装。

```ts
import { pptRenderer } from '@file-viewer/renderer-ppt'
```

通过组件的 `renderers` 选项传入 `pptRenderer`。普通 ESM 打包器会从已安装包解析默认解析 Worker，无需显式 URL。Full 和 IIFE 部署在 `vendor/ppt/dist/` 交付经过校验的自托管运行时。

无需 WASM、内置字体或持久帧缓存。字体由宿主浏览器提供，SVG 布局和 Canvas 快照在主线程执行。引擎源码保持私有，发行时保留包内 LICENSE 和 NOTICE.md。PPTX、编辑和保存不属于本 renderer 范围。
