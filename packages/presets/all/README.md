# @file-viewer/preset-all

<!-- FILE_VIEWER_PACKAGE_HEADER -->
<p>
  <a href="https://www.npmjs.com/package/@file-viewer/preset-all"><img src="https://img.shields.io/npm/v/@file-viewer%2Fpreset-all?logo=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@file-viewer/preset-all"><img src="https://img.shields.io/npm/dm/@file-viewer%2Fpreset-all?logo=npm" alt="npm downloads"></a>
  <a href="https://github.com/flyfish-dev/file-viewer/stargazers"><img src="https://img.shields.io/github/stars/flyfish-dev/file-viewer?style=flat&logo=github" alt="GitHub stars"></a>
  <a href="https://github.com/flyfish-dev/file-viewer/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License: Apache-2.0"></a>
</p>

<p>
  <a href="https://github.com/flyfish-dev/file-viewer">GitHub</a> · <a href="https://doc.file-viewer.app/zh/">文档</a> · <a href="https://demo.file-viewer.app/">在线 Demo</a> · <a href="https://doc.file-viewer.app/guide/formats">格式矩阵</a> · <a href="https://github.com/flyfish-dev/file-viewer/issues">问题反馈</a> · <a href="https://github.com/flyfish-dev/file-viewer/blob/main/packages/presets/all/README.en.md">English</a>
</p>

<p>
  <a href="https://demo.file-viewer.app/"><img src="https://raw.githubusercontent.com/flyfish-dev/file-viewer/main/docs/public/_media/file-viewer-demo-v3-zh.webp" width="760" alt="File Viewer 在线演示：Word、Excel、PPT、3D 模型、CAD 图纸与二进制检查器"></a>
</p>

> ⭐ 如果 File Viewer 对你有帮助，欢迎到 [GitHub](https://github.com/flyfish-dev/file-viewer) 点个 Star。

Flyfish File Viewer 的全量 renderer preset。它把当前完整格式矩阵包装成一个可显式装配的 preset，作为 2.x 按需渲染架构的兼容桥梁。

## 何时使用

- 你希望继续获得和官方 demo 一致的完整格式支持。
- 你正在从默认全量依赖迁移到按需 renderer 架构。
- 你希望先用一个完整 preset 接入，后续再替换为 `@file-viewer/preset-lite`、`@file-viewer/preset-office`、`@file-viewer/preset-engineering` 或更细的单 renderer 组合。

## 用法

推荐在 Vite 项目中让 `@file-viewer/vite-plugin` 自动发现本 preset：

```bash
pnpm add @file-viewer/vue3 @file-viewer/core @file-viewer/vite-plugin @file-viewer/preset-all
```

```ts
import { fileViewerRenderers } from '@file-viewer/vite-plugin'

export default {
  plugins: [
    fileViewerRenderers({
      copyAssets: true
    })
  ]
}
```

组件默认 `autoRenderers:true`，因此不需要手动把 `allRenderers` 传入业务组件。

需要完全手动控制 registry 时再直接传入：

```ts
import FileViewer from '@file-viewer/vue3'
import { allRenderers } from '@file-viewer/preset-all'

const options = {
  renderers: allRenderers,
}
```

如果你希望业务只加载这个 preset 提供的 renderer，可以使用 replace 模式：

```ts
const options = {
  rendererMode: 'replace',
  renderers: allRenderers,
}
```

当前版本会优先聚合已经拆出的 `@file-viewer/renderer-word`、`@file-viewer/renderer-spreadsheet`、`@file-viewer/renderer-pdf`、`@file-viewer/renderer-ofd`、`@file-viewer/renderer-presentation`、`@file-viewer/renderer-cad`、`@file-viewer/renderer-drawing`、`@file-viewer/renderer-3d`、`@file-viewer/renderer-data`、`@file-viewer/renderer-eda`、`@file-viewer/renderer-typst`、`@file-viewer/renderer-archive`、`@file-viewer/renderer-email`、`@file-viewer/renderer-epub`、`@file-viewer/renderer-text`、`@file-viewer/renderer-image`、`@file-viewer/renderer-media`、`@file-viewer/renderer-mindmap` 和 `@file-viewer/renderer-geo`。core 仅保留轻量原生链路和共享协议，本 preset 保持作为全量聚合层。

轻量附件优先使用 `@file-viewer/preset-lite`，办公文档优先使用 `@file-viewer/preset-office`，CAD / 3D / EDA 等工程附件优先使用 `@file-viewer/preset-engineering`。`preset-all` 更适合官方 Demo、内部全格式附件中心或迁移期兼容层。

## 文档

- 按需渲染架构: <https://doc.file-viewer.app/guide/on-demand-renderers>
- 支持格式: <https://doc.file-viewer.app/guide/formats>

## 格式与相关包

File Viewer 在浏览器内预览 275+ 种扩展名，覆盖 Office、PDF/OFD、CAD、3D、压缩包、邮件、图片、音视频和代码，无需服务端转码；完整清单见 [格式矩阵](https://doc.file-viewer.app/guide/formats)。

- 组件：`@file-viewer/web`、`@file-viewer/vue3`、`@file-viewer/vue2.7`、`@file-viewer/vue2.6`、`@file-viewer/react`、`@file-viewer/react-legacy`、`@file-viewer/svelte`、`@file-viewer/jquery`，以及对应的 `-full` 包
- 能力组合：`@file-viewer/preset-lite`、`@file-viewer/preset-office`、`@file-viewer/preset-engineering`、`@file-viewer/preset-all`
- 构建：`@file-viewer/vite-plugin`、`file-viewer-copy-assets`

## 许可证

本包采用 Apache-2.0。`*-full` 包包含 `@flyfish-dev/cad-viewer` 等 DWG/DWF/DWFX 运行时，该部分采用 **AGPL-3.0-only**，使用 CAD 能力时请遵守其许可证。详见 [LICENSE](https://github.com/flyfish-dev/file-viewer/blob/main/LICENSE)。
