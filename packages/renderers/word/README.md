# @file-viewer/renderer-word

Flyfish File Viewer 的 Word / OpenDocument renderer 包。standard/full 默认承接 DOCX/DOCM/DOTX/DOTM、旧版 DOC/DOT 与 ODT/ODP；RTF 由 `@file-viewer/capability-rtf` 显式启用。

## 用法

```ts
import FileViewer from '@file-viewer/vue3'
import { wordRenderer } from '@file-viewer/renderer-word'

const options = {
  rendererMode: 'replace',
  renderers: wordRenderer,
}
```

也可以和其他 renderer 一起组合：

```ts
import { wordRenderer } from '@file-viewer/renderer-word'
import { pdfRenderer } from '@file-viewer/renderer-pdf'
import { presentationRenderer } from '@file-viewer/renderer-presentation'

const options = {
  rendererMode: 'replace',
  renderers: [wordRenderer, pdfRenderer, presentationRenderer],
}
```

官方 Demo 和完整格式矩阵可以直接使用 `@file-viewer/preset-all`。

## 能力边界

- DOCX / DOCM / DOTX / DOTM 使用自研 `@file-viewer/docx`，默认 Worker 解析、连续流式阅读、目录字段缓存、异步分批渲染，并跟随 viewer 主题启用暗黑文档面。
- DOC / DOT 使用 `@file-viewer/doc`，并套用 Word 风格纸张阅读面、缩放、打印和 HTML 导出适配。
- 安装 RTF capability 后才使用 `rtf.js`；未安装时会显示精确 CLI 启用命令。ODT / ODP 读取 OpenDocument 包内 `content.xml` 做安全结构预览。
- 继续复用 core 的统一搜索、缩放、打印、导出、生命周期和操作能力。

## 离线资产

DOCX Worker 默认读取 viewer assets 下的：

- `vendor/docx/docx.worker.js`
- `vendor/docx/jszip.min.js`

私有化部署时可以通过 `options.docx.workerUrl` 和 `options.docx.workerJsZipUrl` 覆盖：

```ts
const options = {
  docx: {
    workerUrl: '/file-viewer/vendor/docx/docx.worker.js',
    workerJsZipUrl: '/file-viewer/vendor/docx/jszip.min.js',
  },
}
```

DOCX 暗黑渲染默认由 `options.theme` 决定：`dark` 开启、`light` 关闭、`system` 跟随浏览器系统主题。需要业务固定效果时可传 `options.docx.darkMode: true / false`。

DOC、DOCX 与 RTF 的外部链接及 HTTP(S) 图片关系默认阻断。只有显式设置 `options.docx.externalLinkPolicy: 'allow'` 和 `options.docx.externalResourcePolicy: 'allow'` 才会启用；链接仍只接受 HTTP(S)、`mailto:`、`tel:` 和安全相对地址，未知协议与协议相对地址始终拒绝。内嵌图片、内部书签以及本地 `data:`/`blob:` 图片资源不受影响。

标准 renderer 会在挂载前净化 `rtf.js` 产生的 DOM。自定义 RTF 集成若直接消费 HTML，应先调用 `sanitizeFileViewerRtfHtml(document, markup, options)`；该边界与标准挂载使用同一链接策略和 DOMPurify 配置。严格 Trusted Types CSP 需允许 `file-viewer-document-sanitizer` 策略名。

## 迁移说明

`@file-viewer/core` 已不再直接依赖 `@file-viewer/docx`、`@file-viewer/doc`、`rtf.js`、`linkedom` 或 `@xmldom/xmldom`。需要 Word 完整预览时，请安装本包并通过 `renderers` 传入，或使用 `@file-viewer/preset-all`。
