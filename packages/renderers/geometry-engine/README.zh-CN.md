# @file-viewer/geometry-engine

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/geometry-engine/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/geometry-engine/README.zh-CN.md)

Flyfish File Viewer 的无 UI、框架无关几何内核包。它已经提供浏览器原生的 STEP / STP、IGES / IGS 和 BREP 解析：文件在本地 OCCT Worker 中完成三角化，不需要上传或服务端转换。IFC 和 Rhino 3DM 目前只提供格式识别与准确的能力提示，尚未接入完整几何渲染。

```ts
import { importOcctGeometryFile } from '@file-viewer/geometry-engine'

const result = await importOcctGeometryFile(buffer, 'step', {
  workerUrl: '/viewer-assets/wasm/model/occt-worker.js',
  runtimeUrl: '/viewer-assets/wasm/model/occt-import-js.js',
  wasmUrl: '/viewer-assets/wasm/model/occt-import-js.wasm',
  params: {
    linearUnit: 'millimeter',
    linearDeflectionType: 'bounding_box_ratio',
    linearDeflection: 0.001,
    angularDeflection: 0.5,
  },
})
```

`result` 包含 OCCT 输出的装配层级、网格、法线、索引和面颜色信息，可继续转换为 Three.js 或其他渲染对象。解析默认在一次性 Worker 中执行，文件字节和网格缓冲区使用 transferable 传递；完成、取消、报错或超时后 Worker 都会释放。`timeoutMs` 默认是 120 秒。只有 Worker 确实不可用时才建议设置 `useWorker: false`，因为回退会占用主线程。

## 离线资产

运行时不访问 CDN。部署时需要把下列文件放到同一套静态资源中：

- `wasm/model/occt-worker.js`
- `wasm/model/occt-import-js.js`
- `wasm/model/occt-import-js.wasm`
- `wasm/model/LICENSE.occt.txt`
- `wasm/model/LICENSE.occt-import-js.txt`

`@file-viewer/vite-plugin`、full 包和仓库构建脚本会复制这些资产。直接集成本包时，需要自行托管并传入 `workerUrl`、`runtimeUrl` 和 `wasmUrl`。应用部署在子路径、资源域名或受控网关下时，请传入最终可访问的绝对 URL 或带前缀 URL，不要依赖站点根路径。

严格 CSP 至少应允许资产来源出现在 `worker-src`、`script-src` 和用于获取 WASM 的 `connect-src` 中；部分浏览器还要求 `script-src 'wasm-unsafe-eval'` 才能编译 WebAssembly。Worker 使用本地 `importScripts()` 加载 runtime，因此不要只放行 WASM 而漏掉 runtime 脚本。

## 能力边界

- `inspectGeometryKernelFile()` 仍可只读取文件前缀，识别 STEP / IGES / IFC / 3DM / BREP 常见签名。
- STEP / STP、IGES / IGS 和 BREP 走 `occt-import-js` / OpenCascade，已经具备完整网格预览路径。
- IFC 仍需要独立的 `web-ifc` / That Open 集成；3DM 仍需要 McNeel `rhino3dm` 集成。当前不会把它们伪装成已支持预览。
- OCCT 与 `occt-import-js` 的许可证文件必须随离线资产一起分发。

把重型几何能力留在独立包中，可以让 `@file-viewer/core` 保持轻量，同时隔离 Worker、WASM、许可证和真实工程样本回归边界。
