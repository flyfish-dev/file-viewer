# @file-viewer/renderer-eda

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/eda/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/eda/README.zh-CN.md)

Flyfish File Viewer 的独立 EDA renderer 包。它承接 OLB、DRA、GDSII、OASIS 等电子设计与版图文件的安全结构预览，避免普通文档预览场景安装 EDA 解析链路。

## 用法

```ts
import FileViewer from '@file-viewer/vue3'
import { edaRenderer } from '@file-viewer/renderer-eda'

const options = {
  rendererMode: 'replace',
  renderers: edaRenderer,
}
```

也可以和其他 renderer 一起组合：

```ts
import { edaRenderer } from '@file-viewer/renderer-eda'
import { cadRenderer } from '@file-viewer/renderer-cad'

const options = {
  rendererMode: 'replace',
  renderers: [edaRenderer, cadRenderer],
}
```

## 能力边界

- `gds` 读取标准 GDSII record，提取 library、structure、boundary、path、text、sref/aref 和坐标边界；小文件生成 SVG 快速版图预览，元素较多时自动使用 `@file-viewer/eda-layout` 的 WebGL typed-array 批次和 canvas 渲染。
- `oas` / `oasis` 的可读文本版图夹具会生成 SVG 预览；真实 SEMI 二进制 OASIS 做安全二进制索引、可读字符串、结构候选和诊断，不虚标为完整几何渲染。
- `olb` / `dra` 使用 `cfb` 读取常见复合文档容器，展示结构树、对象候选、属性、可读字符串和诊断。
- GDSII/OASIS 底层能力已经下沉到 `@file-viewer/eda-layout`；OrCAD/Allegro 二进制检查能力已经下沉到 `@file-viewer/eda-orcad`。本包只负责 UI 展示、SVG/WebGL 选择和 File Viewer renderer 协议。
- 全网调研后继续保持边界清晰: GDSII 有成熟 record parser / WebGL viewer 路线，当前可作为正式快速预览；OASIS 文本夹具用于验证 UI 出图，真实 SEMI 二进制 OASIS 是复杂二进制版图格式，完整几何需要低层 parser、重复结构展开和增量渲染；OLB / DRA 属于 OrCAD / Allegro 专有生态，公开可持续路线是参考 OpenOrCadParser / OpenAllegroParser 做 C++ WASM 或逐步 TS 移植。
- 复杂 OrCAD / Allegro / OASIS 高保真图形能力后续会继续演进为独立 WASM/增量渲染内核，不进入 core 或普通文档首屏链路。

## 迁移说明

`@file-viewer/core` 已不再内置 EDA renderer，也不再默认安装 `cfb`。需要 OLB / DRA / GDSII / OASIS 预览时，请显式安装本包，或使用 `@file-viewer/preset-all`。底层 `parseEdaFile()` 也从本包导出，适合业务侧做结构索引、诊断和后续自研 WASM 内核对接。

## 离线部署

当前 EDA renderer 没有额外 Worker/WASM 静态资产。GDSII 大图使用浏览器原生 WebGL canvas，不依赖公共 CDN；命中 OLB、DRA、GDSII 或 OASIS 格式时才加载 `cfb`、`@file-viewer/eda-layout`、`@file-viewer/eda-orcad` 和本包 UI 代码。
