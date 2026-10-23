# @file-viewer/eda-orcad

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/eda-orcad/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/eda-orcad/README.zh-CN.md)

Flyfish File Viewer 的独立 OrCAD / Allegro 二进制检查内核包。它提供 CFB/OLE2 检测、安全文本采样、十六进制预览和字符串抽取等底层能力，不包含 UI。

```ts
import {
  isOrcadCompoundFile,
  collectOrcadStrings,
  decodeOrcadSample,
} from '@file-viewer/eda-orcad'

const bytes = new Uint8Array(buffer)
const isCfb = isOrcadCompoundFile(bytes)
const strings = collectOrcadStrings([bytes])
const sample = decodeOrcadSample(bytes)
```

## 定位

- 当前用于 `.olb`、`.dra`、`.psm`、`.pad` 等 OrCAD / Allegro 私有二进制文件的结构索引和安全退化预览。
- 不依赖 UI 框架，不依赖 DOM，可独立发布、独立回归。
- 完整符号/封装几何解析会继续沿 OpenOrCadParser / OpenAllegroParser 的 C++ WASM 或 TypeScript 分阶段移植路线推进。

## 为什么单独拆包

OrCAD / Allegro 文件格式公开资料有限，强行把 parser 混进 UI renderer 会让后续维护越来越难。本包把二进制检查和后续 WASM 内核边界固定下来，`@file-viewer/renderer-eda` 只负责展示。
