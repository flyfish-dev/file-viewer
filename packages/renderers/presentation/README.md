# @file-viewer/renderer-presentation

Flyfish File Viewer 的独立演示文稿 renderer 包。传统 PowerPoint 97–2003 `.ppt` 使用独立的 `@file-viewer/ppt@0.3.3` Worker/OffscreenCanvas/WASM 链路，PPTX/PPTM/POTX/POTM/PPSX/PPSM 继续使用 `@file-viewer/pptx` 渐进式渲染；两条链路都接入统一缩放、打印和 HTML 导出。

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

这种配置不会在生产产物中生成传统 `.ppt` 的 CJK 字体或 WASM；需要同时支持两种格式时继续使用根入口 `presentationRenderer`。

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
- File Viewer 将 `.ppt` 公共引擎作为独立版本依赖按需加载；Demo、full 资产包和 CDN/IIFE 会在 `vendor/ppt/` 交付匹配的 ESM、Worker、WASM、CJK 字体与帧缓存模块，默认无需额外配置。
- 0.3.3 默认在支持的浏览器中使用模块 Worker 和 OffscreenCanvas，并通过有界 IndexedDB 帧缓存减少滚动回看时的重复原生渲染；不支持时自动回退到异步主线程链路。
- `options.presentation.pptModuleUrl`、`pptWorkerUrl`、`pptWasmUrl` 和 `pptFontUrl` 只用于自定义静态资源路径；`pptWorker` 与 `pptCache` 可控制 Worker 和有界缓存策略。
- `@file-viewer/ppt` 保留随包独立许可证，不属于本 renderer 的 Apache-2.0 许可范围。公开运行时保留可见水印；移除 PPT 水印需要商业授权。引擎同时要求 Web Crypto SHA-256，通常应部署在 HTTPS 或 localhost。

## 迁移说明

`@file-viewer/core` 已不再直接依赖 `@file-viewer/pptx`，PowerPoint 预览能力由本包和 `@file-viewer/preset-all` 承接。只安装 core 时，PPTX 会提示安装对应 renderer；需要官方 Demo 的完整格式矩阵时，直接传入 `allRenderers` 即可。
