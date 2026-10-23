# @file-viewer/preset-lite

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/presets/lite/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/presets/lite/README.zh-CN.md)

<!-- FILE_VIEWER_PACKAGE_HEADER -->
<p>
  <a href="https://www.npmjs.com/package/@file-viewer/preset-lite"><img src="https://img.shields.io/npm/v/@file-viewer%2Fpreset-lite?logo=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@file-viewer/preset-lite"><img src="https://img.shields.io/npm/dm/@file-viewer%2Fpreset-lite?logo=npm" alt="npm downloads"></a>
  <a href="https://github.com/flyfish-dev/file-viewer/stargazers"><img src="https://img.shields.io/github/stars/flyfish-dev/file-viewer?style=flat&logo=github" alt="GitHub stars"></a>
  <a href="https://github.com/flyfish-dev/file-viewer/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License: Apache-2.0"></a>
</p>

<p>
  <a href="https://github.com/flyfish-dev/file-viewer">GitHub</a> · <a href="https://doc.file-viewer.app/zh/">文档</a> · <a href="https://demo.file-viewer.app/">在线 Demo</a> · <a href="https://doc.file-viewer.app/guide/formats">格式矩阵</a> · <a href="https://github.com/flyfish-dev/file-viewer/issues">问题反馈</a> · <a href="https://github.com/flyfish-dev/file-viewer/blob/main/packages/presets/lite/README.md">English</a>
</p>

<p>
  <a href="https://demo.file-viewer.app/"><img src="https://raw.githubusercontent.com/flyfish-dev/file-viewer/main/docs/public/_media/file-viewer-demo-v3-zh.webp" width="760" alt="File Viewer 在线演示：Word、Excel、PPT、3D 模型、CAD 图纸与二进制检查器"></a>
</p>

> ⭐ 如果 File Viewer 对你有帮助，欢迎到 [GitHub](https://github.com/flyfish-dev/file-viewer) 点个 Star。

Flyfish File Viewer 的轻量 renderer preset。它适合只需要 Markdown、代码、文本、图片、音频和视频预览的业务页面，避免默认安装 Office、PDF、CAD、Typst、3D、压缩包等重链路。

## 何时使用

- 你需要一个开箱即用但非常轻的附件预览能力。
- 业务只处理 README、日志、配置、截图、音视频等常见轻量文件。
- 你希望后续再按需叠加 `@file-viewer/renderer-pdf`、`@file-viewer/renderer-word` 或其它专业 renderer。

## 用法

推荐和 `@file-viewer/vite-plugin` 一起使用。安装本 preset 后，插件会自动发现并激活轻附件能力：

```ts
fileViewerRenderers({
  copyAssets: true
})
```

组件默认 `autoRenderers:true`，业务代码无需手动传 `renderers`。需要完全手动控制 registry 时再直接传入：

```ts
import FileViewer from '@file-viewer/vue3'
import { liteRenderers } from '@file-viewer/preset-lite'

const options = {
  builtinRenderers: 'none',
  rendererMode: 'replace',
  renderers: liteRenderers,
}
```

## 包含的 renderer

- `@file-viewer/renderer-text`
- `@file-viewer/renderer-image`
- `@file-viewer/renderer-media`

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
