# @file-viewer/preset-engineering

<!-- FILE_VIEWER_PACKAGE_HEADER -->
<p>
  <a href="https://www.npmjs.com/package/@file-viewer/preset-engineering"><img src="https://img.shields.io/npm/v/@file-viewer%2Fpreset-engineering?logo=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@file-viewer/preset-engineering"><img src="https://img.shields.io/npm/dm/@file-viewer%2Fpreset-engineering?logo=npm" alt="npm downloads"></a>
  <a href="https://github.com/flyfish-dev/file-viewer/stargazers"><img src="https://img.shields.io/github/stars/flyfish-dev/file-viewer?style=flat&logo=github" alt="GitHub stars"></a>
  <a href="https://github.com/flyfish-dev/file-viewer/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License: Apache-2.0"></a>
</p>

<p>
  <a href="https://github.com/flyfish-dev/file-viewer">GitHub</a> · <a href="https://doc.file-viewer.app/zh/">文档</a> · <a href="https://demo.file-viewer.app/">在线 Demo</a> · <a href="https://doc.file-viewer.app/guide/formats">格式矩阵</a> · <a href="https://github.com/flyfish-dev/file-viewer/issues">问题反馈</a> · <a href="https://github.com/flyfish-dev/file-viewer/blob/main/packages/presets/engineering/README.en.md">English</a>
</p>

<p>
  <a href="https://demo.file-viewer.app/"><img src="https://raw.githubusercontent.com/flyfish-dev/file-viewer/main/docs/public/_media/file-viewer-demo-v3-zh.webp" width="760" alt="File Viewer 在线演示：Word、Excel、PPT、3D 模型、CAD 图纸与二进制检查器"></a>
</p>

> ⭐ 如果 File Viewer 对你有帮助，欢迎到 [GitHub](https://github.com/flyfish-dev/file-viewer) 点个 Star。

Flyfish File Viewer 的工程类 renderer preset。它面向 CAD、三维模型、Draw.io / Excalidraw / Mermaid / PlantUML、XMind、地理数据、Typst、EDA、压缩包和数据资产等专业附件场景。

## 何时使用

- 业务集中在研发、制造、设计、工程交付、EDA 初筛或技术文档协作。
- 你需要 CAD / 3D / 图形 / 地理 / EDA 等专业格式，但不想安装完整 demo 的所有 renderer。
- 你希望这些 WASM、Worker、vendor 资产都继续通过统一 manifest 和 `@file-viewer/vite-plugin` 自托管。

## 用法

推荐和 `@file-viewer/vite-plugin` 一起使用。安装本 preset 后，插件会自动发现并激活工程附件能力：

```ts
fileViewerRenderers({
  copyAssets: true
})
```

组件默认 `autoRenderers:true`，业务代码无需手动传 `renderers`。需要完全手动控制 registry 时再直接传入：

```ts
import FileViewer from '@file-viewer/vue3'
import { engineeringRenderers } from '@file-viewer/preset-engineering'

const options = {
  builtinRenderers: 'none',
  rendererMode: 'replace',
  renderers: engineeringRenderers,
}
```

## 包含的 renderer

- `@file-viewer/renderer-cad`
- `@file-viewer/renderer-3d`
- `@file-viewer/renderer-drawing`
- `@file-viewer/renderer-mindmap`
- `@file-viewer/renderer-geo`
- `@file-viewer/renderer-typst`
- `@file-viewer/renderer-archive`
- `@file-viewer/renderer-data`
- `@file-viewer/renderer-eda`

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
