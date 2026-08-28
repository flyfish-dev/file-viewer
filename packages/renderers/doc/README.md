# @file-viewer/doc

一个面向 **MS-DOC（`.doc` 二进制 Word）** 的 **TypeScript 严格类型** 解析与预览库。它把旧版 Word 文档解析为结构化 AST，再渲染为可直接嵌入任意项目的 `HTML + CSS`，同时提供 DOM Viewer 与 Web Worker 通道。

> 本项目处理的是 **`.doc`**，不是 `.docx`。
> 本包基于 npm 已公开的 `msdoc-viewer@0.2.0` 旧版源码维护，不包含新版私有文档引擎实现。

## 特性

- **整仓 TypeScript 重构**：源码、公开 API、Worker 协议、解析 AST 全部使用 TypeScript，并开启 `strict` 模式
- **完整声明文件产物**：构建后输出 `dist/*.d.ts`，便于社区阅读、联想、二次开发
- **纯前端方案**：不依赖 LibreOffice、COM、ActiveX 或服务器端转换
- **按 MS-DOC 主链路实现**：CFB/OLE → FIB → CLX/Piece Table → FKP → PAPX/CHPX/TAPX → STSH → HTML
- **可扩展架构**：把二进制读取、属性解码、样式继承、表格布局、渲染层完全拆分
- **支持 Web Worker**：避免大文档解析阻塞 UI 线程

## 当前能力

已经覆盖的主要能力：

- CFB/OLE 容器读取
- FIB（`FibBase` / `FibRgLw` / `FibRgFcLcb`）解析
- CLX / Piece Table 文本恢复
- FKP（PAPX / CHPX）属性读取
- STSH 样式表解析与样式继承
- 字体表读取
- 常见字符样式：粗体、斜体、下划线、删除线、字号、颜色、高亮、大小写、上下标、字体切换
- 常见段落样式：对齐、缩进、段前后距、行距、分页控制、边框
- 表格：`sprmTDefTable`、单元格宽度、横向/纵向合并、边框、垂直对齐、nowrap、fitText
- 图片：按 MS-DOC PICF / OfficeArt BLIP 规范提取内嵌 PNG、JPEG、DIB、TIFF，并支持 EMF/WMF 转 SVG 预览
- OLE / ObjectPool 附件提取
- 域代码的基础处理（例如超链接）
- 浏览器 Viewer 与 Worker Client

## 工程结构

```text
src/
  core/
    binary.ts        # 二进制读取器
    cfb.ts           # CFB/OLE 容器解析
    inflate.ts       # OfficeArt 压缩 metafile 的 zlib/deflate 解压
    utils.ts         # 字节、编码、范围等底层工具
  msdoc/
    fib.ts           # FIB 读取
    clx.ts           # CLX / Piece Table
    fkp.ts           # FKP 页读取
    sprm.ts          # SPRM 操作数解码
    properties.ts    # PAPX / CHPX / TAPX 到状态对象的归并
    styles.ts        # STSH / 样式继承
    fonts.ts         # 字体表
    officeart.ts     # OfficeArt 内联 shape / BLIP 辅助解析
    objects.ts       # PICF / OfficeArt 图片与 OLE / ObjectPool
    vector.ts        # EMF/WMF 转 SVG
    parser.ts        # 主解析流程，输出 AST
  render/
    html.ts          # AST -> HTML/CSS
  types.ts           # 完整类型声明与公共接口
  viewer.ts          # DOM Viewer
  worker-client.ts   # Worker 客户端
  worker.ts          # Worker 入口
  index.ts           # 公共导出

demo/
  index.html

test/
  smoke.mjs
```

## 安装

```bash
npm install @file-viewer/doc
```

历史 `msdoc-viewer` 包名会通过兼容别名继续导出同一套 API。

## 仓库开发与构建

```bash
pnpm install
pnpm --filter @file-viewer/doc type-check
pnpm --filter @file-viewer/doc build
pnpm --filter @file-viewer/doc verify:github-34
```

构建产物输出到 `dist/`：

- `dist/index.js`
- `dist/index.d.ts`
- `dist/worker.js`
- 其余模块的 JS / d.ts

## 快速开始

### 1）直接解析并渲染

```ts
import { parseMsDoc, renderMsDoc } from '@file-viewer/doc';

const buffer = await file.arrayBuffer();
const parsed = parseMsDoc(buffer);
const rendered = renderMsDoc(parsed);

document.getElementById('app')!.innerHTML = `
  <style>${rendered.css}</style>
  <div class="msdoc-root">${rendered.html}</div>
`;
```

外部链接和关联图片默认阻断。确需访问可信外部资源时，应分别显式设置
`externalLinkPolicy: 'allow'` 和 `externalResourcePolicy: 'allow'`；内嵌图片及书签不受影响。

### 2）使用内置 Viewer

```ts
import { createMsDocViewer } from '@file-viewer/doc';

const container = document.getElementById('app')!;
const viewer = createMsDocViewer(container);

await viewer.load(file);
```

### 3）使用 Worker 提升体验

```ts
import { createMsDocViewer, MsDocWorkerClient } from '@file-viewer/doc';

const workerClient = MsDocWorkerClient.create(
  new URL('./node_modules/@file-viewer/doc/dist/worker.js', import.meta.url)
);

const viewer = createMsDocViewer(document.getElementById('app')!, {
  workerClient,
});

await viewer.load(file);
```

## API 概览

### `parseMsDoc(input, options?)`

把 `.doc` 解析成结构化结果：

```ts
import type { MsDocParseResult } from '@file-viewer/doc';
```

核心字段：

- `warnings`: 解析期告警
- `meta`: 文档元数据与统计
- `fonts`: 字体表摘要
- `styles`: 样式表摘要
- `blocks`: 结构化块级 AST（段落、表格、附件）
- `assets`: 图片 / 附件资产

### `renderMsDoc(parsed, options?)`

把 AST 渲染为：

- `html`
- `css`
- `warnings`
- `meta`
- `assets`
- `parsed`

### `parseMsDocToHtml(input, options?)`

一步完成解析与渲染。

### `createMsDocViewer(container, config?)`

返回一个面向浏览器的 viewer：

- `load(input, options?)`
- `mount(rendered)`
- `clear()`
- `destroy()`
- `value`

### `MsDocWorkerClient`

为 Worker 提供强类型 RPC 包装：

- `parse(input, options?)`
- `render(parsed, options?)`
- `parseToHtml(input, options?)`
- `destroy()`

## 关键类型

所有公共类型都从根入口导出，例如：

```ts
import type {
  MsDocParseResult,
  MsDocRenderResult,
  MsDocBlock,
  ParagraphBlock,
  TableBlock,
  MsDocAsset,
  MsDocParseOptions,
  MsDocRenderOptions,
  MsDocViewer,
} from '@file-viewer/doc';
```

这意味着：

- 社区开发者可以直接消费 `AST` 与 `asset` 数据自行渲染
- 也可以在现有渲染器之外实现 Markdown、Canvas、PDF 等输出层
- Worker 主线程通信协议也有完整类型约束，避免“隐式 any 消息格式”问题

## 严格类型与可维护性说明

这次重构的重点不只是把文件后缀改成 `.ts`，而是把整条主链路都显式类型化：

- 二进制结构：CFB/FIB/CLX/FKP
- 样式模型：字符、段落、表格状态对象
- 中间 AST：段落、行内节点、表格、附件
- 渲染结果：HTML/CSS/资产
- Viewer / Worker 协议

同时给关键模块补充了注释，尤其是：

- `BinaryReader` 的边界读取行为
- Worker 请求/响应通道
- parser 主流程
- 样式与属性归并逻辑

## 本地验证

```bash
npm run smoke
```

这个命令会：

1. 先运行 TypeScript 构建
2. 再读取 `test/test.doc`
3. 输出 `test/rendered-sample.html`

如果你要手工打开 demo：

```bash
npm run build
# 然后用任意静态服务器打开 demo/index.html
```

## 已知边界

MS-DOC 是历史包袱很重的二进制格式，虽然主链路已经完整重构，但以下场景仍建议用更多真实样本持续压测：

- 极端复杂的嵌套表格
- 非常规域代码组合
- 少见的 OLE 嵌入形式
- 某些兼容模式下的边角 sprm 变体
- 仅保存外部路径、未嵌入字节的链接图片（会给出占位提示，无法在离线环境加载本地盘路径）

这些场景并不影响当前的整体架构，后续继续扩展时可直接在现有 TS 类型体系上增量补强。

## 许可证

MIT
