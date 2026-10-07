# @file-viewer/renderer-3d

Flyfish File Viewer 的独立 3D 模型 renderer。它使用 Three.js、OrbitControls 和按格式异步加载的 loader，在浏览器内预览 GLB / GLTF、OBJ、STL、PLY、FBX、DAE、3DS、3MF、AMF、USD、KMZ、PCD、VRML、XYZ、VTK 等模型；STEP / STP、IGES / IGS 和 BREP 则通过本地 OCCT Worker 完成真实几何解析和渲染。

## 用法

```ts
import FileViewer from '@file-viewer/vue3'
import { modelRenderer } from '@file-viewer/renderer-3d'

const options = {
  rendererMode: 'replace',
  renderers: modelRenderer,
  model: {
    workerUrl: '/viewer-assets/wasm/model/occt-worker.js',
    runtimeUrl: '/viewer-assets/wasm/model/occt-import-js.js',
    wasmUrl: '/viewer-assets/wasm/model/occt-import-js.wasm',
    workerTimeoutMs: 120_000,
  },
}
```

也可以把 `modelRenderer` 与 CAD 等 renderer 组合，或直接使用已经聚合它的 `@file-viewer/preset-all`。full 包和 `@file-viewer/vite-plugin` 会准备默认离线资产；只安装 renderer 时，需要自行托管 OCCT Worker、runtime、WASM 和两个许可证文件。

专用能力继续通过显式子路径按需安装：IFC 使用 `@file-viewer/renderer-3d/ifc`，LAS / LAZ / COPC / GeoTIFF / COG / CityJSON / 3D Tiles / 3TZ 使用 `@file-viewer/renderer-3d/geo3d`。普通 3D 入口不会导入这两个子入口，Full preset 也不会隐式加入它们。安装、自托管运行时资源和配置分别见 `IFC.md` 与 `GEO3D.md`。

默认路径为：

- `wasm/model/occt-worker.js`
- `wasm/model/occt-import-js.js`
- `wasm/model/occt-import-js.wasm`

部署在子路径或独立资产域名时，通过 `options.model.workerUrl`、`runtimeUrl`、`wasmUrl` 传入最终 URL。不要使用运行时 CDN 回退。严格 CSP 需要在 `worker-src`、`script-src` 和 `connect-src` 中允许对应来源；部分浏览器还需要 `script-src 'wasm-unsafe-eval'`。

## 能力边界

- STEP / STP、IGES / IGS、BREP：在 Worker 中使用 `occt-import-js` / OpenCascade 三角化，保留装配层级、实例、法线和面颜色，再构建 Three.js 场景。
- 通用模型：支持 WebGL 轨道控制、适配视图、网格、坐标轴、线框和自动旋转。`gltf` / `dae` / `fbx` 的外部贴图或二进制资源继续以原始 `url` 目录为基准加载。
- 全局统一缩放：renderer 注册标准缩放 provider，因此外层工具栏的放大、缩小、比例重置和适配视图会直接控制相机；滚轮、触控板和捏合缩放也会同步更新全局比例状态。
- IFC 可通过显式的 `@file-viewer/renderer-3d/ifc` 专用入口启用；LAS / LAZ / COPC / GeoTIFF / COG / CityJSON / 3D Tiles / 3TZ 可通过 `@file-viewer/renderer-3d/geo3d` 启用。3DM 仍需专门的 `rhino3dm` renderer。
- `@file-viewer/core` 不内置 Three.js 或几何内核。需要模型预览时请显式安装本包、相应 preset，或 full 包。
