# msdoc-viewer

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/compat/msdoc-viewer/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/compat/msdoc-viewer/README.zh-CN.md)

`msdoc-viewer` is the historical compatibility alias for `@file-viewer/doc`. Existing projects can keep their old imports; new projects should install:

```bash
npm install @file-viewer/doc
```

```ts
import { parseMsDoc, renderMsDoc } from 'msdoc-viewer'
```

This alias package only re-exports the public API. The maintained source package lives at [flyfish-dev/docjs](https://github.com/flyfish-dev/docjs).
