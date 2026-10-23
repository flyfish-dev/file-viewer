# @file-viewer/preset-office

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/presets/office/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/presets/office/README.zh-CN.md)

<!-- FILE_VIEWER_PACKAGE_HEADER -->
<p>
  <a href="https://www.npmjs.com/package/@file-viewer/preset-office"><img src="https://img.shields.io/npm/v/@file-viewer%2Fpreset-office?logo=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@file-viewer/preset-office"><img src="https://img.shields.io/npm/dm/@file-viewer%2Fpreset-office?logo=npm" alt="npm downloads"></a>
  <a href="https://github.com/flyfish-dev/file-viewer/stargazers"><img src="https://img.shields.io/github/stars/flyfish-dev/file-viewer?style=flat&logo=github" alt="GitHub stars"></a>
  <a href="https://github.com/flyfish-dev/file-viewer/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License: Apache-2.0"></a>
</p>

<p>
  <a href="https://github.com/flyfish-dev/file-viewer">GitHub</a> · <a href="https://doc.file-viewer.app/zh/">文档</a> · <a href="https://demo.file-viewer.app/">在线 Demo</a> · <a href="https://doc.file-viewer.app/guide/formats">格式矩阵</a> · <a href="https://github.com/flyfish-dev/file-viewer/issues">问题反馈</a> · <a href="https://github.com/flyfish-dev/file-viewer/blob/main/packages/presets/office/README.md">English</a>
</p>

<p>
  <a href="https://demo.file-viewer.app/"><img src="https://raw.githubusercontent.com/flyfish-dev/file-viewer/main/docs/public/_media/file-viewer-demo-v3-zh.webp" width="760" alt="File Viewer 在线演示：Word、Excel、PPT、3D 模型、CAD 图纸与二进制检查器"></a>
</p>

> ⭐ 如果 File Viewer 对你有帮助，欢迎到 [GitHub](https://github.com/flyfish-dev/file-viewer) 点个 Star。

Flyfish File Viewer 的 Office / 文档 renderer preset。它把 PDF、Word、Excel、PowerPoint、OFD、RTF 和 OpenDocument 这些高频办公文档组合成一个可显式安装的能力包。

## 何时使用

- 业务主要处理合同、报告、表格、演示稿、OFD 票据或政企办公附件。
- 你希望安装一个文档 preset，而不是手写多个 renderer import。
- 你不需要 CAD、3D、EDA、压缩包、邮件等完整 demo 能力。

## 用法

推荐和 `@file-viewer/vite-plugin` 一起使用。安装本 preset 后，插件会自动发现并激活 Office 文档能力：

```ts
fileViewerRenderers({
  copyAssets: true
})
```

组件默认 `autoRenderers:true`，业务代码无需手动传 `renderers`。需要完全手动控制 registry 时再直接传入：

```ts
import FileViewer from '@file-viewer/vue3'
import { officeRenderers } from '@file-viewer/preset-office'

const options = {
  builtinRenderers: 'none',
  rendererMode: 'replace',
  renderers: officeRenderers,
}
```

## 包含的 renderer

- `@file-viewer/renderer-pdf`
- `@file-viewer/renderer-word`
- `@file-viewer/renderer-spreadsheet`
- `@file-viewer/renderer-presentation`
- `@file-viewer/renderer-ofd`

## 文档

- 按需渲染架构: <https://doc.file-viewer.app/guide/on-demand-renderers>
- 支持格式: <https://doc.file-viewer.app/guide/formats>

## 格式与相关包

File Viewer 在浏览器内预览 275+ 种扩展名，覆盖 Office、PDF/OFD、CAD、3D、压缩包、邮件、图片、音视频和代码，无需服务端转码；完整清单见 [格式矩阵](https://doc.file-viewer.app/guide/formats)。

- 组件：`@file-viewer/web`、`@file-viewer/vue3`、`@file-viewer/vue2.7`、`@file-viewer/vue2.6`、`@file-viewer/react`、`@file-viewer/react-legacy`、`@file-viewer/svelte`、`@file-viewer/jquery`，以及对应的 `-full` 包
- 能力组合：`@file-viewer/preset-lite`、`@file-viewer/preset-office`、`@file-viewer/preset-engineering`、`@file-viewer/preset-all`
- 构建：`@file-viewer/vite-plugin`、`file-viewer-copy-assets`

## 许可证

本包采用 Apache-2.0。详见 [LICENSE](https://github.com/flyfish-dev/file-viewer/blob/main/LICENSE)。
