# file-viewer3

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/compat/vue3-unscoped/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/compat/vue3-unscoped/README.zh-CN.md)

`file-viewer3` is the historical unscoped compatibility package. It only re-exports `@file-viewer/vue3`. New integrations should prefer the standard package name `@file-viewer/vue3`.

```bash
npm install file-viewer3
```

```ts
import { createApp } from 'vue'
import FileViewer from 'file-viewer3'

import App from './App.vue'

createApp(App).use(FileViewer).mount('#app')
```

See the official documentation for the full format matrix, options, lifecycle hooks, beforeOperation, theme, watermark, search, zoom, print, and export APIs: https://doc.file-viewer.app/

Online demo: https://demo.file-viewer.app/. License: Apache-2.0. For second development or commercial use, keep clear Flyfish Viewer attribution; shared compatibility fixes are welcome.
