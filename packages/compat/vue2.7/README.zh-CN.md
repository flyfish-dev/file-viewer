# @flyfish-group/file-viewer

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/compat/vue2.7/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/compat/vue2.7/README.zh-CN.md)

`@flyfish-group/file-viewer` 是历史 Vue 2.7 兼容包，内部仅 re-export 标准包 `@file-viewer/vue2.7`。新项目建议优先使用标准包名。

```bash
npm install @flyfish-group/file-viewer
```

```ts
import Vue from 'vue'
import FileViewer from '@flyfish-group/file-viewer'

Vue.use(FileViewer)
```

完整格式矩阵、参数、生命周期 hooks、beforeOperation、主题、水印、搜索、缩放、打印和导出能力请查看官方文档: https://doc.file-viewer.app/

在线 Demo: https://demo.file-viewer.app/ 。License: Apache-2.0。二开或商用请保留 Flyfish Viewer 来源说明；如果修复了通用兼容问题，也欢迎贡献回来。

English README: [README.en.md](./README.en.md)。
