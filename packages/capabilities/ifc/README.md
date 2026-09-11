# @file-viewer/capability-ifc

`@file-viewer/renderer-3d` 的显式按需 IFC / BIM capability。只有安装并导入本包时才启用 IFC 路径；普通 3D、Engineering preset 和 Full 基线不会因此携带 `web-ifc`、That Open Components/Fragments 或对应的 WASM / Worker。

```bash
npm install @file-viewer/renderer-3d @file-viewer/capability-ifc @file-viewer/assets-ifc
```

```ts
import { modelRenderer } from '@file-viewer/renderer-3d'
import '@file-viewer/capability-ifc'

const options = {
  rendererMode: 'extend',
  renderers: [modelRenderer],
  ifc: {
    fitToModel: true,
    enableSelection: true,
    showProperties: true,
  },
}
```

把同版本的 `@file-viewer/assets-ifc` 发布到 File Viewer 资产根目录。该资产包包含固定版本的 `web-ifc` 浏览器 ESM/WASM，以及匹配版本的 That Open Fragments 自托管 Worker。也可以覆盖 `ifc.apiUrl`、`ifc.wasmUrl`、`ifc.wasmMtUrl`、`ifc.thatOpen.workerUrl`；运行时没有公共 CDN fallback。

## Backend 与大 IFC 策略

`ifc.backend` 支持 `auto`、`web-ifc`、`thatopen`。

- `auto` 为默认值。小 IFC 继续走直接 `web-ifc` + Three.js；文件达到 `ifc.performance.largeModelThresholdBytes`（默认 16 MiB）后优先走 Worker 驱动的 That Open Fragments。
- `web-ifc` 强制使用直接 renderer，适合需要确定性兼容行为的业务。
- `thatopen` 强制使用 That Open Components + Fragments。

大文件走 Fragments 时，渲染 / culling / LOD 由 Fragments Worker 负责，并且不会为了工具栏统计在打开时就枚举全部元素 ID；属性继续按选择事件读取。`ifc.performance.maxSourceBytes` 是可选的业务硬限制，File Viewer 默认不设置固定最大文件大小。

```ts
const options = {
  ifc: {
    backend: 'auto',
    performance: {
      largeModelThresholdBytes: 24 * 1024 * 1024,
      // maxSourceBytes: 750 * 1024 * 1024, // 可选业务策略
      preferFragmentsForLargeModels: true,
    },
  },
}
```

## Extensibility：That Open 原样透传桥

File Viewer **不会**把 That Open 的每个参数重新复制成一套 Flyfish schema。`thatOpen` 就是给高级用户保留的兼容“开口”：

```ts
const options = {
  ifc: {
    backend: 'thatopen',
    thatOpen: {
      // 1:1 原对象传给 @thatopen/components IfcLoader.setup(...)
      components: {
        autoSetWasm: false,
        webIfc: {
          CIRCLE_SEGMENTS: 7,
        },
      },

      // 1:1 key 写入 FragmentsManager.core.settings
      fragments: {
        maxUpdateRate: 73,
      },

      // 1:1 对象传给 Fragments IfcImporter 的 process 配置
      importer: {
        // 直接放当前 @thatopen/fragments 支持的 importer 参数
      },

      // importer.process(...) 之前的命令式 escape hatch
      configureImporter({ importer, modules }) {
        // 需要时按业务项目使用的 That Open 类型自行 cast
      },

      // 模型 ready 后直接暴露底层运行时对象
      async configure({ components, world, fragments, loader, importer, model, modules }) {
        // 这里 Flyfish 不再增加一层 wrapper
      },
    },

    // 与具体 backend 无关、由 Flyfish 保持稳定的 hook
    async configure(context) {
      console.log(context.backend, context.largeModel, context.thatOpen)
    },
  },
}
```

这些透传对象故意使用开放字典类型；Flyfish 不改名、不校验单个 key、也不做版本转换。因此 That Open 新增参数后，业务无需等待 File Viewer 发布对应字段即可使用。代价也是明确的：这个 escape hatch 内部的值遵循固定 That Open 版本的 API，而外层 Flyfish 配置保持稳定。

当前能力包括浏览器本地 IFC 解析、旋转/平移/缩放、适配模型、元素选择、实体类型 / `Name` / `GlobalId`、有界属性展示、资源释放以及稳定的 `ifc.configure(context)`。BIM 编辑、碰撞检测、BCF、工程量计算、剖切和测量不在当前范围。

## 回归 fixture

仓库在 `test/fixtures/ifc/` 中提交了两个 buildingSMART IFC4 Simple-Scene fixture：`Building-Architecture.ifc` 与 `Building-Structural.ifc`。同目录保留上游 CC BY 4.0 许可、归属、来源路径和 SHA-256。永久 IFC Validation workflow 会在 Chromium 中使用自托管运行时渲染这两个文件，并额外强制执行 That Open backend，避免 Fragments 路径只经过类型检查而没有真实浏览器验证。

`web-ifc@0.0.77` 使用 MPL-2.0；`@thatopen/components@3.4.8` 和 `@thatopen/fragments@3.4.7` 使用 MIT。独立资产包保留其实际再分发文件的 notice；File Viewer capability wrapper 继续使用 Apache-2.0。
