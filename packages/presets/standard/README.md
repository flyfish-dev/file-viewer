# @file-viewer/preset-standard

<!-- FILE_VIEWER_PACKAGE_HEADER -->
<p>
  <a href="https://www.npmjs.com/package/@file-viewer/preset-standard"><img src="https://img.shields.io/npm/v/@file-viewer%2Fpreset-standard?logo=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@file-viewer/preset-standard"><img src="https://img.shields.io/npm/dm/@file-viewer%2Fpreset-standard?logo=npm" alt="npm downloads"></a>
  <a href="https://github.com/flyfish-dev/file-viewer/stargazers"><img src="https://img.shields.io/github/stars/flyfish-dev/file-viewer?style=flat&logo=github" alt="GitHub stars"></a>
  <a href="https://github.com/flyfish-dev/file-viewer/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License: Apache-2.0"></a>
</p>

<p>
  <a href="https://github.com/flyfish-dev/file-viewer">GitHub</a> · <a href="https://doc.file-viewer.app/zh/">文档</a> · <a href="https://demo.file-viewer.app/">在线 Demo</a> · <a href="https://doc.file-viewer.app/guide/formats">格式矩阵</a> · <a href="https://github.com/flyfish-dev/file-viewer/issues">问题反馈</a> · <a href="https://github.com/flyfish-dev/file-viewer/blob/main/packages/presets/standard/README.en.md">English</a>
</p>

<p>
  <a href="https://demo.file-viewer.app/"><img src="https://raw.githubusercontent.com/flyfish-dev/file-viewer/main/docs/public/_media/file-viewer-demo-v3-zh.webp" width="760" alt="File Viewer 在线演示：Word、Excel、PPT、3D 模型、CAD 图纸与二进制检查器"></a>
</p>

> ⭐ 如果 File Viewer 对你有帮助，欢迎到 [GitHub](https://github.com/flyfish-dev/file-viewer) 点个 Star。

File Viewer v3 的稳定常用格式基线：Word/DOCX、PDF、OFD、现代 PPTX、Excel、压缩包、邮件、文本/代码、图片、音视频。

该包有意不包含 iWork、DICOM、CAD、3D、EDA、Geo、Typst、Draw.io、WordPerfect、Hangul 和旧版二进制 PPT。额外能力通过独立 capability package 显式安装。

当前 2.x 的 `preset-all` 和各 `*-full` 包行为保持不变；`standard` 是为 v3 非破坏迁移新增的配置。

## 格式与相关包

File Viewer 在浏览器内预览 275+ 种扩展名，覆盖 Office、PDF/OFD、CAD、3D、压缩包、邮件、图片、音视频和代码，无需服务端转码；完整清单见 [格式矩阵](https://doc.file-viewer.app/guide/formats)。

- 组件：`@file-viewer/web`、`@file-viewer/vue3`、`@file-viewer/vue2.7`、`@file-viewer/vue2.6`、`@file-viewer/react`、`@file-viewer/react-legacy`、`@file-viewer/svelte`、`@file-viewer/jquery`，以及对应的 `-full` 包
- 能力组合：`@file-viewer/preset-lite`、`@file-viewer/preset-office`、`@file-viewer/preset-engineering`、`@file-viewer/preset-all`
- 构建：`@file-viewer/vite-plugin`、`file-viewer-copy-assets`

## 许可证

本包采用 Apache-2.0。详见 [LICENSE](https://github.com/flyfish-dev/file-viewer/blob/main/LICENSE)。
