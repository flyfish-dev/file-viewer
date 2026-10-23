# @file-viewer/eda-layout

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/eda-layout/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/eda-layout/README.zh-CN.md)

Flyfish File Viewer 的独立 EDA 版图内核包。它只提供框架无关的 TypeScript API，当前负责标准 GDSII 记录解析、GDSII WebGL 绘制批次生成、OASIS 可读文本夹具解析和真实二进制 OASIS 检测边界，不包含任何 UI 组件。

```ts
import {
  parseGdsLayout,
  parseOasisTextLayout,
  createEdaLayoutWebglBatch,
  inspectOasisLayout,
} from '@file-viewer/eda-layout'

const layout = parseGdsLayout(new Uint8Array(buffer))
const batch = layout ? createEdaLayoutWebglBatch(layout) : undefined
const oasisFixture = parseOasisTextLayout(new Uint8Array(buffer))
const oasis = inspectOasisLayout(new Uint8Array(buffer))
```

## 定位

- `parseGdsLayout()` 解析标准 GDSII stream record，输出 structure、boundary、path、text、reference、bounds 等只读预览模型。
- `parseOasisTextLayout()` 解析项目内可读 OASIS 文本夹具，输出和 GDSII 相同的只读预览模型，用于 demo、文档和后续 parser 回归。
- `createEdaLayoutWebglBatch()` 把 GDSII boundary/path/text/reference 归一化为 triangle / line / point typed arrays，供 UI renderer 或业务自研 WebGL 层消费。
- `inspectOasisLayout()` 识别真实二进制 OASIS 文件边界，并把完整 OASIS 几何展开留给独立 WASM/WebGL 内核演进。
- 不依赖 Vue、React、Web Component 或 DOM，可独立发布、独立回归。
- `@file-viewer/renderer-eda` 负责把本包输出转换为可视化 UI。

## 后续路线

GDSII 已具备浏览器 WebGL 批次输出能力，`@file-viewer/renderer-eda` 会在元素较多时自动使用 WebGL canvas，SVG 保留为小文件和不支持 WebGL 环境的回退。可读 OASIS 文本夹具用于保证 OAS/OASIS 路由、版图 UI 和 smoke 测试能真实出图；真实 SEMI 二进制 OASIS 的完整工业级浏览仍需要低层 record parser、重复结构展开、层级 cell 导航和大文件增量渲染，本包是后续接入 KLayout/gdstk/OpenAccess 类 WASM 内核或自研 WebGL tile renderer 的稳定入口。
