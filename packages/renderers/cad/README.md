# @file-viewer/renderer-cad

Flyfish File Viewer 的独立 CAD renderer 包。它基于 `@flyfish-dev/cad-viewer` 提供 DWG、DXF、DWF、DWFx 和 XPS 的浏览器端预览，并通过 File Viewer 统一的 asset manifest 解析 wasm / worker 路径，适合企业内网和离线部署。

## 用法

```ts
import FileViewer from '@file-viewer/vue3'
import { cadRenderer } from '@file-viewer/renderer-cad'

const options = {
  rendererMode: 'replace',
  renderers: cadRenderer,
}
```

也可以和其他 renderer 一起组合：

```ts
import { cadRenderer } from '@file-viewer/renderer-cad'
import { pdfRenderer } from '@file-viewer/renderer-pdf'

const options = {
  rendererMode: 'replace',
  renderers: [pdfRenderer, cadRenderer],
}
```

## 能力边界

- 支持 `.dwg`、`.dxf`、`.dwf`、`.dwfx`、`.xps`。
- DWG 使用 Worker + LibreDWG WASM 按需解析，避免阻塞主线程。
- DXF 使用 JavaScript parser 并归一化为统一 CAD document。
- DWF / DWFx / XPS 使用 native renderer，并通过 `dwfv-render.wasm` 提供高性能 raster / WebGL fallback。
- 支持图层显示切换、结构统计、适配视图、缩放、全局 toolbar zoom provider 和 resize observer。

## 离线资产

默认会从 viewer assets 下读取：

- `wasm/cad/`
- `wasm/cad/dwg-worker.js`
- `wasm/cad/dwfv-render.wasm`
- `wasm/cad/libredwg-web.js`
- `wasm/cad/libredwg-web.wasm`

私有化部署时可以通过 `options.cad.wasmPath`、`options.cad.workerUrl`、`options.cad.dwfWasmUrl` 覆盖。

## 迁移说明

CAD 预览已经从 `@file-viewer/core` 中彻底移出，core 只保留资产 manifest、类型和兼容错误提示，不再默认安装 `@flyfish-dev/cad-viewer`。完整 CAD 能力请安装本包并传入 `renderers`，或直接使用 `@file-viewer/preset-all`。

## 黑白出图模式

`cad.colorMode` 可设为 `source` 或 `monochrome`。黑白模式通过 CAD 引擎的实体颜色策略实现，不使用 CSS 滤镜，因此 Canvas、WebGL、文字覆盖层及原生 DWF 渲染可保持一致，同时保留透明度、线型、线宽和源文件数据。

默认原色模式使用深色背景，黑白模式使用白纸黑线。自适应对比度会提高与背景过近的线条和文字的可见性；要求严格显示源颜色时可设 `cad.canvasOptions.contrastMode: 'preserve'`。显式设置的 `cad.canvasOptions.background` / `cad.dwfBackground` 不会被模式切换覆盖。

```ts
{
  cad: {
    colorMode: 'monochrome',
    monochromeColor: '#000000',
    showColorModeToggle: true,
  },
}
```

### 图片、打印与离线 HTML

先选择原色或黑白模式，再使用统一工具栏的“打印”或“HTML”。输出会重新绘制并立即捕获当前视图，包含 WebGL 线条和文字覆盖层，不含图层面板或工具栏。HTML 内嵌 PNG，不依赖临时 blob 地址；打印窗口可使用浏览器的“另存为 PDF”，并保留 File Viewer 的权限检查、水印和遮罩。

CAD 工具栏的 PNG、JPEG 按钮下载同一视图，并保留配置的文本或图片水印。`toolbar.permissions.download` 与 `toolbar.permissions['export-html']` 都必须允许；捕获前由所属组件执行既有 `beforeOperation`、工具栏 `beforeOperation` 和 `beforeDownload` 钩子。取消操作、切换文档或撤销权限后不会下载旧快照。`cad.showImageExport: false` 可隐藏这两个格式专用按钮。水印资源不可读时明确失败，预览仍保持可用。打印遮罩仅作用于打印，不作用于图片下载。

这里输出的是当前相机视图 / 当前 DWF 页的栅格快照，不是整个 CAD 文件的矢量转换，也不会自动批量打印其他图纸页。需要完整图纸时先点击“适配”。原文件下载始终保持输入字节不变。
