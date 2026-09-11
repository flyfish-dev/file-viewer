# @file-viewer/geometry-engine

Flyfish File Viewer 的无 UI、框架无关几何内核包。它提供浏览器原生 STEP / STP、IGES / IGS 和 BREP 解析：文件在本地 OCCT Worker 中完成三角化，不需要上传或服务端转换。IFC 的签名识别仍保留在这里用于路由，但完整 IFC / BIM 可视预览由显式可选的 `@file-viewer/capability-ifc` 在 `@file-viewer/renderer-3d` 上提供。Rhino 3DM 仍只提供签名识别和能力提示。

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

运行时不访问 CDN。部署 STEP / IGES / BREP 时需要：

- `wasm/model/occt-worker.js`
- `wasm/model/occt-import-js.js`
- `wasm/model/occt-import-js.wasm`
- `wasm/model/LICENSE.occt.txt`
- `wasm/model/LICENSE.occt-import-js.txt`

这些 OCCT 文件由 `@file-viewer/assets-model` 负责。IFC 使用单独的 `@file-viewer/assets-ifc`，因此 MPL-2.0 `web-ifc` API/WASM 只有明确选择 IFC capability 时才会安装。

严格 CSP 至少应允许资产来源出现在 `worker-src`、`script-src` 和用于获取 WASM 的 `connect-src` 中；部分浏览器还要求 `script-src 'wasm-unsafe-eval'` 才能编译 WebAssembly。

## 能力边界

- `inspectGeometryKernelFile()` 仍可只读取文件前缀，识别 STEP / IGES / IFC / 3DM / BREP 常见签名。
- STEP / STP、IGES / IGS 和 BREP 走 `occt-import-js` / OpenCascade，已经具备完整网格预览路径。
- IFC 可视预览位于 `@file-viewer/capability-ifc` + `@file-viewer/assets-ifc`，不属于本几何内核或默认 preset 依赖闭包。
- 3DM 仍需要 McNeel `rhino3dm` 独立链路，当前不会把它伪装成完整预览。
- OCCT 与 `occt-import-js` 的许可证文件必须随离线资产一起分发。

把重型几何能力按 capability 分离，可以让 `@file-viewer/core` 保持轻量，同时独立维护 Worker、WASM、许可证和真实工程样本回归边界。
