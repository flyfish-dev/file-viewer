# @file-viewer/renderer-presentation

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/presentation/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/presentation/README.zh-CN.md)

Flyfish File Viewer 的独立演示文稿 renderer 包。PowerPoint 97–2003 二进制 `.ppt` / `.pot` 使用独立的 `@file-viewer/ppt@1.0.2` TypeScript 引擎，PPTX/PPTM/POTX/POTM/PPSX/PPSM 使用 `@file-viewer/pptx`；两条链路都接入统一缩放、打印和 HTML 导出。

## 用法

```ts
import FileViewer from '@file-viewer/vue3'
import { presentationRenderer } from '@file-viewer/renderer-presentation'

const options = {
  rendererMode: 'replace',
  renderers: presentationRenderer,
}
```

只需要一种 PowerPoint 格式族时，使用稳定子路径避免另一条引擎进入生产 bundle：

```ts
import { pptRenderer } from '@file-viewer/renderer-presentation/ppt'
import { pptxRenderer } from '@file-viewer/renderer-presentation/pptx'

const pptxOnlyOptions = {
  rendererMode: 'replace',
  renderers: pptxRenderer,
}
```

Vite 项目也可以让插件生成同一条 PPTX-only import：

```ts
import { fileViewerRenderers } from '@file-viewer/vite-plugin'

fileViewerRenderers({ formats: ['pptx'] })
```

这种配置不会将二进制 `.ppt` 引擎带入生产产物；需要同时支持两种格式时继续使用根入口 `presentationRenderer`。

也可以和其他 renderer 组合：

```ts
const options = {
  rendererMode: 'replace',
  renderers: [presentationRenderer],
}
```

## 说明

- 二进制 `.ppt` 与 OOXML 演示文稿保持独立解析链路，不会把传统 PPT 误送进 ZIP/PPTX 解析器。
- `odp` 仍由 core 的 OpenDocument 兼容 renderer 负责，避免把不同格式族的解析链路混在一起。
- File Viewer 按需加载独立版本的 `.ppt` 引擎。Demo、Full 资产包和 CDN/IIFE 在 `vendor/ppt/` 交付经过校验的完整包；独立模块和解析 Worker 位于 `vendor/ppt/dist/`，完整部署生成的资产即可使用默认 URL。
- TypeScript 引擎通过模块 Worker 解析，SVG 布局与 Canvas 快照在主线程完成；Worker 不可用时回退直接解析。无需 WASM 和内置字体包，文字布局使用宿主浏览器字体。
- `options.presentation.pptModuleUrl`、`pptWorkerUrl` 用于自定义静态路径；`pptWorker` 选择解析路径。旧 `pptWasmUrl`、`pptFontUrl`、`pptCache` 参数仅为迁移兼容而接受，不加载原生资源、不启用持久帧缓存。
- 新 TypeScript 公共编译包采用 Apache-2.0，源码保持私有，交付时保留其 LICENSE 和 NOTICE.md。旧 native/WASM 发行线的许可与水印要求不变。复杂效果与缺失的宿主字体仍可能影响预览。

## 迁移说明

`@file-viewer/core` 已不再直接依赖 `@file-viewer/pptx`，PowerPoint 预览能力由本包和 `@file-viewer/preset-all` 承接。只安装 core 时，PPTX 会提示安装对应 renderer；需要官方 Demo 的完整格式矩阵时，直接传入 `allRenderers` 即可。
