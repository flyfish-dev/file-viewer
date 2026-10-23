# @file-viewer/renderer-epub

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/ebook/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/ebook/README.zh-CN.md)

Flyfish File Viewer 的独立电子书 renderer 包。它负责 `.epub` 文件解析、目录展示、滚动阅读、上一页/下一页导航和阅读进度同步，也负责 `.umd` 移动电子书的元数据、目录和 zlib 正文解析。

## 用法

```ts
import FileViewer from '@file-viewer/vue3'
import { ebookRenderer } from '@file-viewer/renderer-epub'

const options = {
  builtinRenderers: 'none',
  renderers: ebookRenderer,
}
```

也可以与其他 renderer 组合：

```ts
import { ebookRenderer } from '@file-viewer/renderer-epub'
import { pdfRenderer } from '@file-viewer/renderer-pdf'
import { archiveRenderer } from '@file-viewer/renderer-archive'

const options = {
  builtinRenderers: 'none',
  renderers: [pdfRenderer, archiveRenderer, ebookRenderer],
}
```

## 能力边界

- `.epub` 使用包内置的 `epubjs` 引擎解析 EPUB 包、OPF 元数据、导航目录和章节资源。引擎按需加载，并在构建时固定使用安全的 XML DOM 实现；用户无需额外安装引擎或配置 CDN。
- `.umd` 使用项目内解析器读取早期移动电子书封装，并通过 `pako` 解压正文段。
- 阅读区采用滚动文档模式，兼容性优先，避免部分浏览器在超宽分页布局下出现正文白板。
- 支持目录窗格显隐、章节跳转、上一页/下一页和阅读进度展示。
- 不绑定任何在线服务或公共 CDN，适合内网知识库、培训资料和长文档附件预览。
- 随包的 `dist/vendor/epubjs.NOTICE.txt` 记录引擎及所有内联依赖的版本、来源和许可证文本。

## 深色阅读

无需重载的行为适用于观察到的主题属性、系统配色变化及 Vanilla core 的主题更新路径。框架组件与工具栏/controller 的选项更新可能重新初始化预览。

EPUB 正文与目录跟随 `options.theme`，支持 `system` 与实时切换。深色阅读覆盖文字和纯色背景，不反相图片，也不重新加载章节。设置 `epub.darkMode: false` 保留书籍原始配色，设为 `true` 可强制深色阅读。UMD、FB2 的渲染不受影响。

## 迁移说明

`@file-viewer/core` 已不再内置 EPUB / UMD renderer，也不再直接安装 `epubjs` 或 `pako`。需要电子书预览时，请显式安装本包，或直接使用 `@file-viewer/preset-all` 聚合能力；`epubjs` 已作为本包的离线懒加载产物随包发布，不会进入应用的外部生产依赖树。
