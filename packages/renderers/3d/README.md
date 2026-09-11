# @file-viewer/renderer-3d

Flyfish File Viewer 的独立 3D 模型 renderer。它使用 Three.js、OrbitControls 和按格式异步加载的 loader 预览 GLB / GLTF、OBJ、STL、PLY、FBX、DAE、3DS、3MF、AMF、USD、KMZ、PCD、VRML、XYZ、VTK 等；STEP / STP、IGES / IGS、BREP 使用自托管 OCCT Worker。

IFC / BIM 是**显式按需 capability**。基础 `@file-viewer/renderer-3d` 只保留 `.ifc` 路由钩子，不直接依赖 `web-ifc`、`@thatopen/components` 或 `@thatopen/fragments`。需要 IFC 时再安装并导入 `@file-viewer/capability-ifc`，同时部署独立的 `@file-viewer/assets-ifc`。因此普通 3D、Engineering preset 和 Full package 不会自动携带重型 BIM runtime。

## 基础 3D 用法

```ts
import { modelRenderer } from '@file-viewer/renderer-3d'

const options = {
  rendererMode: 'replace',
  renderers: [modelRenderer],
  model: {
    workerUrl: '/file-viewer/wasm/model/occt-worker.js',
    runtimeUrl: '/file-viewer/wasm/model/occt-import-js.js',
    wasmUrl: '/file-viewer/wasm/model/occt-import-js.wasm',
  },
}
```

`@file-viewer/preset-engineering` / `@file-viewer/preset-all` 会包含 `modelRenderer`，但**不会自动启用 IFC**。

## 显式启用 IFC / BIM

```bash
npm install @file-viewer/capability-ifc @file-viewer/assets-ifc
```

```ts
import '@file-viewer/capability-ifc'

const options = {
  ifc: {
    backend: 'auto',
    fitToModel: true,
    enableSelection: true,
    showProperties: true,
  },
}
```

CLI 项目可以使用：

```bash
npx file-viewer-cli config add ifc --write
npx file-viewer-cli install --yes
```

未导入 capability 时打开 `.ifc` 会得到明确的 opt-in 提示，不会静默加载重型 runtime。

### IFC backend 与大模型路由

capability 支持 `ifc.backend: 'auto' | 'web-ifc' | 'thatopen'`。

- `auto` 对普通 / 较小 IFC 使用直接 `web-ifc` + Three.js；达到默认 16 MiB 阈值后优先使用 That Open Components + Fragments。
- `web-ifc` 强制直接 renderer。
- `thatopen` 强制 Worker 驱动的 Fragments renderer。

阈值与可选硬上限可配置：

```ts
const options = {
  ifc: {
    performance: {
      largeModelThresholdBytes: 24 * 1024 * 1024,
      preferFragmentsForLargeModels: true,
      // maxSourceBytes: 750 * 1024 * 1024,
    },
  },
}
```

Fragments 大模型不会为了显示计数而在打开阶段枚举全部元素；culling / LOD 由自托管 Fragments Worker 负责，属性继续按选择事件读取。

### IFC 能力边界与 Extensibility

可选 IFC adapter 提供浏览器本地 IFC 打开、旋转 / 平移 / 缩放、fit-to-model、元素选择、基本实体 / `Name` / `GlobalId` / 属性检查、生命周期清理，以及稳定的 Flyfish `ifc.configure(context)`。

```ts
const options = {
  ifc: {
    async configure(context) {
      const info = await context.getElementInfo(42)
      console.log(context.backend, context.largeModel, context.schema, info.globalId)
      await context.selectElement(42)
      context.fitToModel()
    },
  },
}
```

对于 That Open 高级配置，File Viewer 不复制其全部 API：`ifc.thatOpen.components` 原样传给 `IfcLoader.setup(...)`，`ifc.thatOpen.fragments` 原样写入 `FragmentsManager.core.settings`，`ifc.thatOpen.importer` 原样传给 importer processing options。`configureImporter(...)` 和 `configure(...)` 则直接暴露底层 That Open runtime 对象，不增加 Flyfish wrapper。

完整 pass-through 合约与大模型策略见 [IFC / BIM 专门指南](https://doc.file-viewer.app/zh/guide/ifc)。

BIM 编辑、碰撞检测、BCF、工程量计算、剖切和测量仍不在当前范围。

### 自托管 IFC runtime

`@file-viewer/assets-ifc` 固定并 staging 两个 backend 需要的浏览器 runtime：

```text
web-ifc-api.js                     -> wasm/model/web-ifc-api.js
web-ifc.wasm                       -> wasm/model/web-ifc.wasm
web-ifc-mt.wasm                    -> wasm/model/web-ifc-mt.wasm
fragments-worker.mjs               -> wasm/model/fragments-worker.mjs
LICENSE.web-ifc-MPL-2.0.md         -> wasm/model/LICENSE.web-ifc-MPL-2.0.md
LICENSE.thatopen-fragments-MIT.txt -> wasm/model/LICENSE.thatopen-fragments-MIT.txt
```

运行时没有公共 CDN fallback；只有自定义自托管布局时才需要覆盖 `ifc.apiUrl`、`ifc.wasmUrl`、`ifc.wasmMtUrl` 或 `ifc.thatOpen.workerUrl`。

`web-ifc@0.0.77` 使用 MPL-2.0；`@thatopen/components@3.4.8` 与 `@thatopen/fragments@3.4.7` 使用 MIT。File Viewer 的 renderer / capability wrapper 继续使用 Apache-2.0。

## 其他 3D 资产

OCCT 默认路径：

- `wasm/model/occt-worker.js`
- `wasm/model/occt-import-js.js`
- `wasm/model/occt-import-js.wasm`

这些资产由 `@file-viewer/assets-model` 负责。严格 CSP 需要允许相应 worker/script/connect 来源；部分浏览器还需要 `script-src 'wasm-unsafe-eval'`。

## 能力边界

- STEP / STP、IGES / IGS、BREP 使用 `occt-import-js` / OpenCascade Worker 三角化。
- 通用模型支持 WebGL 轨道控制、适配视图、网格、坐标轴、线框和自动旋转。
- IFC 只有在 `@file-viewer/capability-ifc` 激活后才可用，web-ifc / Fragments runtime 都在浏览器本地并完全自托管。
- 3DM 仍只提供签名识别 / 接入提示，需要独立 `rhino3dm` 路径。
