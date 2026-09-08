# @file-viewer/pptx

Flyfish File Viewer 的原生 PPTX 渲染引擎包，从历史稳定实现中独立拆分，便于持续维护和单独发布。

## 特性

- 纯 TypeScript/DOM 入口，不依赖 Vue、React 或 iframe。
- 使用 Web Worker 解析 PPTX，按页渐进输出，避免阻塞主线程。
- 保留历史原生解析链路中的主题、图片、形状、表格、文本和基础图表处理。
- 支持 `fitMode`、`zoomPercent`、自定义 Worker URL / Worker factory，方便内网、离线和 CSP 场景。

`resolvePptxPackageWorkerUrl()` 可供集成层识别打包器已输出或包目录直接提供的 Worker URL。未识别时返回 `undefined`，不代表文件不存在；集成层仍可使用自己的资产复制策略或显式 Worker 配置。

## 使用

```ts
import { PptxViewer } from '@file-viewer/pptx'

const buffer = await file.arrayBuffer()
const viewer = await PptxViewer.open(buffer, document.querySelector('#app')!, {
  fitMode: 'contain',
  zoomPercent: 100,
  onSlideRendered(index) {
    console.log('slide rendered', index)
  },
})

await viewer.setZoom(125)
viewer.destroy()
```

在 Flyfish File Viewer 中通常无需直接使用本包，`@file-viewer/core` 会按 PPTX 类型自动按需加载。
