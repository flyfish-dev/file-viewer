# @flyfish-group/file-viewer

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/compat/vue2.7/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/compat/vue2.7/README.zh-CN.md)

`@flyfish-group/file-viewer` is the historical Vue 2.7 compatibility package. It only re-exports the standard `@file-viewer/vue2.7` package. New integrations should prefer the standard package name.

```bash
npm install @flyfish-group/file-viewer
```

```ts
import Vue from 'vue'
import FileViewer from '@flyfish-group/file-viewer'

Vue.use(FileViewer)
```

See the official documentation for the full format matrix, options, lifecycle hooks, beforeOperation, theme, watermark, search, zoom, print, and export APIs: https://doc.file-viewer.app/

Online demo: https://demo.file-viewer.app/. License: Apache-2.0. For second development or commercial use, keep clear Flyfish Viewer attribution; shared compatibility fixes are welcome.

中文 README: [README.md](./README.md).
