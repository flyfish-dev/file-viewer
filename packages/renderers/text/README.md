# @file-viewer/renderer-text

Markdown 中标明受支持语言的围栏代码块默认自动高亮，Shadow DOM 内同样可用，无需调用 `highlightAll()`。语言模块按需从本地加载；未知语言以及超过每份文档 512 KiB 高亮预算的代码保持原文显示。通过 `options.text.markdownHighlight: false` 可以关闭。

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
- HTML / HTM 默认显示静态页面，提供页面与源码切换；`options.text.htmlView: 'source'` 可默认查看原始源码。页面保留内联 CSS 和内嵌图片，通过净化、CSP 和独立沙箱阻止脚本、表单、外链跳转和外部资源请求，不用于运行完整网站。
- XML / Vue 等默认按源码转义展示。XML 可显式启用下方的 XSD/XSLT profiles；HTML 源码视图继续支持高亮、格式化和大文本虚拟化。
- Markdown 使用 `marked` 输出只读阅读面，并保留明暗主题、表格滚动和统一缩放 provider。
- Markdown 不再因为通用大文本阈值自动退化成源码；如业务必须限制超大 Markdown，可单独设置 `options.text.markdownVirtualizeAboveBytes`。
- 不绑定任何在线服务或公共 CDN，适合内网日志、配置、代码片段、README 和知识库附件预览。

## 迁移说明

standard/full 默认包含基础代码、文本和 Markdown，不安装 `diff2html`、`pako` 或 Mermaid。打开可选格式时会提示运行 `npx file-viewer-cli add text-tools --write` 或 `add mermaid-markdown --write`；`preset-all` 仅用于显式全量/调试。

## 可选 XML Profiles

XML profiles 使用真实的 libxml2 XML Schema 1.0 和 libxslt XSLT 1.0 WASM 引擎。
普通 text/standard/full 不安装这两个可选引擎，也不会替换浏览器的 `XSLTProcessor`。
需要此功能时，安装固定版本并复制资源：

```sh
pnpm add xmllint-wasm@5.3.0 xslt-polyfill@1.0.29
pnpm exec file-viewer-xml-assets public/file-viewer/xml
```

复制命令不联网、不安装依赖。它会保留目标目录的其他文件，并写入两个引擎的
JS/WASM、`licenses/` 和带 SHA-256 的 `manifest.json`。部署时一并保留许可证。

先注册实现，再把 `xml` 配置传给 Vanilla/Web Component 或其他标准组件：

```ts
import { enableFileViewerXmlProfiles } from '@file-viewer/renderer-text/xml-profiles'

const disableXmlProfiles = enableFileViewerXmlProfiles()
const options = {
  xml: {
    profilesUrl: '/xml-profiles/profiles.json',
    runtime: {
      xsdWorkerUrl: '/file-viewer/xml/xmllint-browser.mjs',
      xsltModuleUrl: '/file-viewer/xml/xslt-wasm.js',
    },
  },
}
// 不再需要全局注册时调用 disableXmlProfiles()。
```

`xmllint.wasm` 必须与 `xmllint-browser.mjs` 位于同一目录。JS/MJS 使用
`text/javascript`，WASM 使用 `application/wasm`。省略 runtime URL 时，
默认从配置的 asset base 下的 `xml/` 查找；未配置 asset base 则相对于页面 URL。
页面 CSP 需允许 `worker-src blob:` 和 WASM 编译（支持该指令的浏览器可使用
`script-src 'wasm-unsafe-eval'`）。引擎和 profiles 仅允许同源 HTTP(S)，不跟随重定向。
所有资源可随应用部署，运行时不依赖外网。

Manifest 示例：

```json
{
  "profiles": [{
    "id": "invoice-v1",
    "match": {
      "rootNamespace": { "enabled": true, "root": "invoice", "namespace": "urn:example:invoice:v1" },
      "xsd": { "enabled": true }
    },
    "xsd": "./invoice.xsd",
    "xslt": "./invoice.xsl"
  }]
}
```

相对路径以 manifest 所在目录为基准。也可以传 `xml.profiles` 数组和 `xml.baseUrl`，
替代 `profilesUrl`。每个 profile 至少启用一项检查；root/namespace 和 XSD 可各自启用，
同时启用时必须全部通过。仅有一个 profile 通过时才转换；多个匹配、无匹配或任何处理错误
都保留 XML 源码，并通过 `xml.onDiagnostic`、标准 `onDiagnostic` 和界面诊断栏说明原因。

转换后的 HTML 经过净化，放入无 sandbox 权限的隔离 iframe，并附带禁止脚本和外网的 CSP。
`View Source` / `View Rendered` 切换使用已保留的原始 buffer，不重新下载、校验或转换，
也不使用解析后重新序列化的 XML。源码视图强制关闭 pretty print；下载仍使用原文件。
可通过 `xml.initialView: 'source'` 默认查看源码，通过 `xml.labels` 定制按钮文字。

DTD、实体声明、XInclude、XSD include/import/redefine/override、XSLT include/import、
`document()` 和扩展指令默认拒绝。当前没有开放外部资源 resolver；需要这些机制的文件会回退源码。
默认总耗时上限 15 秒（最多 60 秒），XML 4 MiB、单个 schema/style 2 MiB、输出 8 MiB、
资源总计 16 MiB、最多 32 个 profiles。`xml.limits` 可降低这些上限，不能取消。
两个引擎的 WASM 线性内存均硬限 64 MiB；超时、取消和卸载会终止 Worker 并释放 Blob URL。

源仓库的 `test/fixtures/issue-305/` 提供可再分发的 valid/invalid XML、XSD、XSLT 和 manifest。
引擎许可证与具体上游来源见 [XML profiles notices](./licenses/xml-profiles/NOTICE.md)。

### Markdown 标题导航

没有显式 ID 的标题会生成保留 Unicode 字符的小写锚点，重复标题追加数字后缀。
既有目录链接（例如 `[简介](#简介)`）只滚动当前预览器，在 Shadow DOM 或同页多个
预览器中保持独立，不修改宿主页 URL。保留显式 ID、外部链接及带修饰键的点击行为。
此能力不负责从 `[TOC]` 指令自动生成目录。

### LRC 歌词

`.lrc` 由文本渲染器处理，已注册到 lite、standard、all 预设。提供时间标注、歌词、
解码后原文三种只读视图，支持一行多时间标签、逐词时间标签、元数据、有符号偏移、
UTF-8／UTF-16／GBK、自动换行和共享缩放。`M:`、`F:`、`D:` 角色继承到下一次显式
切换；无时间文本和未知标记保留。正偏移表示提前显示。本能力不播放音频或模拟同步。
沿用 `options.text.encoding`、`toolbar`、`wrapLongLines`；超大输入或标签展开过多
时回退到原文预览，不静默丢弃内容。歌词中的 HTML 始终按普通文字显示。
