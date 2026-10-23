# file-viewer3

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/compat/vue3-unscoped/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/compat/vue3-unscoped/README.zh-CN.md)

`file-viewer3` 是历史非 scoped 兼容包，内部仅 re-export `@file-viewer/vue3`。新项目建议优先使用标准包名 `@file-viewer/vue3`。

```bash
npm install file-viewer3
```

```ts
import { createApp } from 'vue'
import FileViewer from 'file-viewer3'

import App from './App.vue'

createApp(App).use(FileViewer).mount('#app')
```

完整格式矩阵、参数、生命周期 hooks、beforeOperation、主题、水印、搜索、缩放、打印和导出能力请查看官方文档: https://doc.file-viewer.app/

在线 Demo: https://demo.file-viewer.app/ 。License: Apache-2.0。二开或商用请保留 Flyfish Viewer 来源说明；如果修复了通用兼容问题，也欢迎贡献回来。

English README: [README.en.md](./README.en.md)。
