# IFC / BIM 显式按需能力

<div class="doc-kicker">本地 BIM 预览，显式安装</div>

<p class="doc-lead">
  IFC 是叠加在普通 3D renderer 之上的专业 capability。它不会进入 Engineering / Full 默认依赖闭包，在浏览器本地处理原始 IFC，并可在直接 web-ifc 路径与 Worker 驱动的 That Open Fragments 路径之间切换。
</p>

## 安装

```bash
npm install @file-viewer/renderer-3d @file-viewer/capability-ifc @file-viewer/assets-ifc
```

```ts
import { modelRenderer } from '@file-viewer/renderer-3d'
import '@file-viewer/capability-ifc'

const options = {
  rendererMode: 'extend',
  renderers: [modelRenderer],
}
```

`@file-viewer/preset-engineering`、`@file-viewer/preset-all` 与 Full 兼容包不会自动激活本 capability。CLI 项目可以显式选择：

```bash
npx file-viewer-cli config add ifc --write
npx file-viewer-cli install --yes
```

同版本的 `@file-viewer/assets-ifc` 必须发布到正常 File Viewer 资产根目录。运行时没有公共 CDN fallback。

## Backend 选择

```ts
const options = {
  ifc: {
    backend: 'auto', // 'auto' | 'web-ifc' | 'thatopen'
  },
}
```

`auto` 是正常产品路径：

- 较小 IFC 继续使用直接 `web-ifc` + Three.js；
- 达到 16 MiB 默认阈值后优先使用 That Open Components + Fragments；
- 一旦提供 `ifc.thatOpen`，`auto` 也会选择 That Open，因为调用方已经明确要求配置其底层库；
- 需要确定性时可强制 `web-ifc` 或 `thatopen`。

16 MiB 只是路由启发式规则，并不代表所有小于该值的 IFC 都轻量，也不代表所有大于该值的模型都一定昂贵。业务应根据真实模型调整阈值。

## 大 IFC 文件

```ts
const options = {
  ifc: {
    performance: {
      largeModelThresholdBytes: 24 * 1024 * 1024,
      preferFragmentsForLargeModels: true,
      // 可选产品/安全策略；File Viewer 默认没有固定硬上限。
      maxSourceBytes: 750 * 1024 * 1024,
    },
  },
}
```

大模型优先走 Fragments，因为它使用独立 Worker 并维护 culling / LOD 表示。File Viewer 不会为了显示一个工具栏计数，在大文件打开阶段就枚举全部几何元素 ID；元素数据和属性继续按选择事件读取。

这能改善交互和内存行为，但不会让源 IFC 解析变成零成本：浏览器仍要接收原始 IFC 字节并完成 Fragments 转换。`maxSourceBytes` 让有明确设备上限的部署可以在分配 parser 状态之前拒绝超大源文件。

## Extensibility 合约

稳定的 Flyfish 层保持尽量小：`backend`、适配视图、选择、属性、资产 URL、性能策略与 `configure(context)`。

That Open 的更新频率高于 File Viewer 公共 API。如果把每个 That Open 参数复制成 Flyfish 字段，File Viewer 会不断追逐第三方字段变化。因此 IFC capability 提供明确的 opaque bridge。

### Components 原样透传

`ifc.thatOpen.components` 会在 File Viewer 设置完自托管 / offline-safe 默认值后，作为对象直接传给 `@thatopen/components` 的 `IfcLoader.setup(...)`。

```ts
const options = {
  ifc: {
    backend: 'thatopen',
    thatOpen: {
      components: {
        autoSetWasm: false,
        webIfc: {
          CIRCLE_SEGMENTS: 7,
        },
      },
    },
  },
}
```

Flyfish 不翻译这个对象里的单个 key。未知 / 新增 key 的行为直接由固定版本的 That Open 决定。

### Fragments 原样透传

`ifc.thatOpen.fragments` 的 key 直接写入 `FragmentsManager.core.settings`：

```ts
const options = {
  ifc: {
    thatOpen: {
      fragments: {
        maxUpdateRate: 73,
      },
    },
  },
}
```

这里故意使用开放字典，因此 Fragments 新增 setting 后，不必等待 File Viewer 增加对应类型字段。

### Importer 原样透传

`ifc.thatOpen.importer` 直接传给 Fragments IFC importer 的 processing options：

```ts
const options = {
  ifc: {
    thatOpen: {
      importer: {
        // 直接放当前 @thatopen/fragments IfcImporter 支持的 process 参数。
      },
    },
  },
}
```

### 命令式 escape hatch

并非所有第三方 API 都能用 JSON 表达，因此还会直接暴露底层运行时对象：

```ts
const options = {
  ifc: {
    thatOpen: {
      configureImporter({ importer, modules, components, fragments, loader, world }) {
        // importer.process(...) 前执行
      },
      async configure({ modules, components, fragments, loader, importer, world, model }) {
        // Fragments model ready 后执行
      },
    },

    async configure(context) {
      // 两个 backend 共用的稳定 Flyfish context
      console.log(context.backend, context.fileSizeBytes, context.largeModel)
      // 仅 That Open backend 存在
      console.log(context.thatOpen)
    },
  },
}
```

Flyfish 边界故意把 raw runtime 对象类型保持为 `unknown`。高级业务可以根据自己安装的 `@thatopen/components` / `@thatopen/fragments` 精确版本自行 cast。这样不会把第三方实现类型冻结进 core 公共合约。

## 自托管资产

`@file-viewer/assets-ifc` 固定并发布：

```text
web-ifc-api.js
web-ifc.wasm
web-ifc-mt.wasm
fragments-worker.mjs
LICENSE.web-ifc-MPL-2.0.md
LICENSE.thatopen-fragments-MIT.txt
```

自定义目录可覆盖 `ifc.apiUrl`、`ifc.wasmUrl`、`ifc.wasmMtUrl`、`ifc.thatOpen.workerUrl`。

## 当前范围

本 capability 面向审阅 / inspection：

- 浏览器本地打开 IFC；
- 旋转 / 平移 / 缩放与 fit-to-model；
- 元素选择；
- 实体身份、`Name`、`GlobalId` 与有界属性读取；
- lifecycle cleanup 与 abort；
- 通过上面的 bridge 进行 backend-specific 高级自定义。

BIM 编辑、碰撞检测、BCF、工程量计算、剖切和测量仍不在初始范围。

## 回归覆盖

`test/fixtures/ifc/` 提交了两个未经修改的 buildingSMART IFC4 Simple-Scene 文件，并保留 CC BY 4.0 归属 / 许可与 SHA-256。`test/ifc-optional-capability.spec.ts` 检查可选依赖边界、许可 notice、backend 路由、源文件硬限制和 opaque pass-through 合约。永久 IFC Validation workflow 还会在 Chromium 中从自托管资产打开真实 fixture，并分别执行直接 web-ifc 与 That Open 路径。
