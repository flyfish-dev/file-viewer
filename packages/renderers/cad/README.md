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

    ```ts
    {
      cad: {
        colorMode: 'monochrome',
        monochromeColor: '#000000',
        showColorModeToggle: true,
      },
    }
    ```
