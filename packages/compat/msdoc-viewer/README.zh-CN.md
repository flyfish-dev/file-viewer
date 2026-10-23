# msdoc-viewer

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/compat/msdoc-viewer/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/compat/msdoc-viewer/README.zh-CN.md)

`msdoc-viewer` 是 `@file-viewer/doc` 的历史兼容别名。旧项目可以继续使用原导入路径，新项目建议直接安装：

```bash
npm install @file-viewer/doc
```

```ts
import { parseMsDoc, renderMsDoc } from 'msdoc-viewer'
```

该兼容包只做 API 重导出，源码维护仓为 [flyfish-dev/docjs](https://github.com/flyfish-dev/docjs)。
