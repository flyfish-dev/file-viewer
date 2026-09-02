# @file-viewer/renderer-text

Flyfish File Viewer 的基础代码、文本和 Markdown renderer 包。Mermaid、patch 左右比对和 Git bundle 检查已拆到 `@file-viewer/capability-mermaid` 与 `@file-viewer/capability-text-tools`，不进入 standard/full 默认闭包。

## 用法

```ts
import FileViewer from '@file-viewer/vue3'
import { textRenderer } from '@file-viewer/renderer-text'

const options = {
  builtinRenderers: 'none',
  renderers: textRenderer,
  text: {
    lineNumbers: true,
    wrapLongLines: true,
    prettyPrint: true,
    prettyPrintMaxBytes: 512 * 1024,
  },
}
```

也可以与其他 renderer 组合：

```ts
import { textRenderer } from '@file-viewer/renderer-text'
import { pdfRenderer } from '@file-viewer/renderer-pdf'

const options = {
  builtinRenderers: 'none',
  renderers: [pdfRenderer, textRenderer],
}
```

## 能力边界

- 代码和文本使用 `highlight.js` core + 按语言动态加载，避免一次性注册全部语言。
- 代码、文本和超大 Markdown 源码视图默认显示文件类型、索引状态和行数元信息栏；传入 `options.text.toolbar: false` 可隐藏该 renderer 内部栏，不影响 Viewer 的下载、搜索、缩放等全局工具栏。
- 普通代码和文本可通过 `options.text.lineNumbers: true` 显示行号；行号不会进入复制内容、搜索结果或无障碍朗读。超大文本保留原有的虚拟行号栏，可显式传 `false` 隐藏。
- `options.text.wrapLongLines: true` 仅改变布局，不向源码插入换行。普通预览会按逻辑行维护行号，超大文本仍使用有界虚拟窗口并按可用宽度换行。
- `options.text.prettyPrint: true` 会在支持的结构化文本上按需加载 Prettier 与对应 parser，仅格式化显示副本；工具栏会标明“格式化预览”，并可切回原始源码。JSON/JSONC/JSON5、JavaScript/TypeScript、HTML/Vue、CSS、YAML、Markdown、GraphQL 和 XML 共用同一路径。
- `prettyPrintMaxBytes` 只限制 Prettier，默认继承 `virtualizeAboveBytes`（未配置时为 512 KiB）。超限、语法错误或不支持的格式直接回退原始源码，之后仍由普通或虚拟文本 renderer 决定展示方式。XML 使用保守的 whitespace-preserving 模式；检测到混合内容或 `xml:space="preserve"` 时直接保留原文。
- 历史 `*-full` 包的 script 标签 IIFE 资源不打包 Prettier，该路径下 `prettyPrint` 无错误回退到原始源码；需要格式化预览时使用 ESM 集成（标准组件包或 `@file-viewer/preset-*`）。
- 安装 text-tools capability 后，`patch` 使用 `diff2html` 渲染左右比对视图，`bundle` / `bdl` 才启用 Git bundle 结构检查。
- 安装 Mermaid capability 后，Markdown 内嵌 Mermaid 图才会渲染；未安装时保留源码并显示精确 CLI 启用命令。
- HTML / XML / Vue 等文件按源码方式转义展示，不执行脚本。
- Markdown 使用 `marked` 输出只读阅读面，并保留明暗主题、表格滚动和统一缩放 provider。
- Markdown 不再因为通用大文本阈值自动退化成源码；如业务必须限制超大 Markdown，可单独设置 `options.text.markdownVirtualizeAboveBytes`。
- 不绑定任何在线服务或公共 CDN，适合内网日志、配置、代码片段、README 和知识库附件预览。

## 迁移说明

standard/full 默认包含基础代码、文本和 Markdown，不安装 `diff2html`、`pako` 或 Mermaid。打开可选格式时会提示运行 `npx file-viewer-cli add text-tools --write` 或 `add mermaid-markdown --write`；`preset-all` 仅用于显式全量/调试。
